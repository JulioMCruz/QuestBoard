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

// Agent B — scraper
app.get("/scrape", (req, res) => {
  const urls = String(req.query.urls ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const items = (urls.length ? urls : ["example.com"]).map((url, i) => ({
    url,
    headline: `Headline ${i + 1} scraped from ${url}`,
  }));
  res.json({ agent: "B:scraper", paidTo: AGENT_B, count: items.length, items });
});

// Agent C — summarizer
app.post("/summarize", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const headlines = items.map((i: { headline?: string }) => i.headline).filter(Boolean) as string[];
  const summary =
    headlines.length > 0
      ? `Summary of ${headlines.length} item(s): ${headlines.join(" · ").slice(0, 280)}`
      : "Nothing to summarize.";
  res.json({ agent: "C:summarizer", paidTo: AGENT_C, inputCount: headlines.length, summary });
});

app.listen(PORT, () => {
  console.log(`[agents] B+C listening on http://localhost:${PORT}`);
  console.log(`[agents] network=${NETWORK}  facilitator=${FACILITATOR_URL}`);
  console.log(`[agents] B(scrape $0.05)->${AGENT_B}\n[agents] C(summarize $0.03)->${AGENT_C}`);
});
