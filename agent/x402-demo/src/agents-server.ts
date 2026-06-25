/**
 * QuestBoard paid agent services (Agent B + Agent C).
 *
 * Two HTTP 402 Payment Required endpoints. Each call must carry a signed Stellar
 * USDC payment in the X-PAYMENT header; verification + on-chain settlement are
 * delegated to the x402 facilitator (the relayer), which sponsors network fees.
 *
 *   GET  /scrape      Agent B — $0.05 USDC, paid to AGENT_B_ADDRESS
 *   POST /summarize   Agent C — $0.03 USDC, paid to AGENT_C_ADDRESS
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import express from "express";
import { paymentMiddleware } from "@x402/express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

const PORT = Number(process.env.AGENTS_PORT ?? 4021);
const NETWORK = (process.env.X402_NETWORK ?? "stellar:testnet") as Network;
// Full base path to the relayer's x402 facilitator plugin (the client appends
// /verify, /settle, /supported).
const FACILITATOR_URL =
  process.env.FACILITATOR_URL ??
  "https://stellar-relayer.perkos.xyz/api/v1/plugins/x402-facilitator/call";
const RELAYER_API_KEY = process.env.RELAYER_API_KEY ?? "";
const AGENT_B = process.env.AGENT_B_ADDRESS ?? "GAYHX54UTMNW6DYSMW3KWRFN2YDHNDSZGJ6FOLBZ6565FUXSEIDTWVYW";
const AGENT_C = process.env.AGENT_C_ADDRESS ?? "GBNM4MNPVDV7EGUVUEKY4EHYDBYD572TUTRI3FUBP5AITTBVBVCMCQUR";

// The relayer (OpenZeppelin Relayer) requires a Bearer token on every call.
const facilitator = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
  createAuthHeaders: async () => {
    const h: Record<string, string> = RELAYER_API_KEY
      ? { Authorization: `Bearer ${RELAYER_API_KEY}` }
      : {};
    return { verify: h, settle: h, supported: h };
  },
});

const server = new x402ResourceServer(facilitator).register(NETWORK, new ExactStellarScheme());

const routes = {
  "GET /scrape": {
    accepts: { scheme: "exact", payTo: AGENT_B, price: "$0.05", network: NETWORK },
    description: "QuestBoard Agent B — scrape URLs ($0.05 USDC via x402 on Stellar)",
  },
  "POST /summarize": {
    accepts: { scheme: "exact", payTo: AGENT_C, price: "$0.03", network: NETWORK },
    description: "QuestBoard Agent C — summarize items ($0.03 USDC via x402 on Stellar)",
  },
};

const app = express();
app.use(express.json());
app.use(paymentMiddleware(routes, server));

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// --- Agent B does real work: fetch each URL and extract title/description/text.
async function scrapeUrl(raw: string) {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "QuestBoard-AgentB/0.1" } });
    const html = await r.text();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const description = (
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      ""
    ).trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      url,
      status: r.status,
      title: decodeEntities(title),
      description: decodeEntities(description),
      words: text ? text.split(" ").length : 0,
      excerpt: decodeEntities(text.slice(0, 500)),
    };
  } catch (e) {
    return { url, error: e instanceof Error ? e.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

// --- Agent C does real work: extractive summarization (term-frequency sentence scoring).
const STOP = new Set(
  "the a an and or of to in for on is are be was were with that this as at by from it its their our your you we they he she".split(" ")
);
function summarize(text: string, maxSentences = 3): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? (clean ? [clean] : []);
  if (sentences.length <= maxSentences) return sentences.join(" ");
  const freq: Record<string, number> = {};
  for (const w of clean.toLowerCase().match(/[a-z]{3,}/g) ?? []) if (!STOP.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  return sentences
    .map((s, i) => {
      const words = s.toLowerCase().match(/[a-z]{3,}/g) ?? [];
      const score = words.reduce((a, w) => a + (freq[w] ?? 0), 0) / Math.max(1, words.length);
      return { s, i, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(" ");
}

// Agent B — scraper (paid x402 endpoint)
app.get("/scrape", async (req, res) => {
  const urls = String(req.query.urls ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const targets = urls.length ? urls : ["https://stellar.org"];
  const items = await Promise.all(targets.map(scrapeUrl));
  res.json({ agent: "B:scraper", paidTo: AGENT_B, count: items.length, items });
});

// Agent C — summarizer (paid x402 endpoint)
app.post("/summarize", (req, res) => {
  const items: Array<Record<string, unknown>> = Array.isArray(req.body?.items) ? req.body.items : [];
  const corpus = items
    .map((i) => [i.title, i.description, i.excerpt, i.headline].filter(Boolean).join(". "))
    .filter(Boolean)
    .join(" ");
  const summary = corpus.trim() ? summarize(corpus, 3) : "Nothing to summarize.";
  res.json({ agent: "C:summarizer", paidTo: AGENT_C, inputCount: items.length, words: corpus.split(/\s+/).filter(Boolean).length, summary });
});

app.listen(PORT, () => {
  console.log(`[agents] B+C listening on http://localhost:${PORT}`);
  console.log(`[agents] network=${NETWORK}  facilitator=${FACILITATOR_URL}`);
  console.log(`[agents] B(scrape $0.05)->${AGENT_B}\n[agents] C(summarize $0.03)->${AGENT_C}`);
});
