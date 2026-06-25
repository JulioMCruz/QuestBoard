/**
 * QuestBoard Agent A — research orchestrator (the paying client).
 *
 * Demonstrates multi-hop agent-to-agent commerce over x402 on Stellar:
 *   1. Pays Agent B ($0.05 USDC) to scrape URLs.
 *   2. Pays Agent C ($0.03 USDC) to summarize the scraped items.
 * Each hop is an HTTP 402 -> sign auth entry locally -> retry with X-PAYMENT.
 * Agent A signs with its own keypair (no secret ever leaves this process); the
 * relayer verifies + settles on-chain and sponsors network fees.
 *
 * Run: AGENT_A_SECRET=S... npm run agent-a
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { createEd25519Signer } from "@x402/stellar";
import type { Network } from "@x402/core/types";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";

const NETWORK = (process.env.X402_NETWORK ?? "stellar:testnet") as Network;
const AGENTS_URL = process.env.AGENTS_URL ?? "http://localhost:4021";
const AGENT_A_SECRET = process.env.AGENT_A_SECRET ?? "";

async function main() {
  if (!AGENT_A_SECRET) throw new Error("AGENT_A_SECRET not set (the payer's Stellar secret seed).");

  // Headless keypair signer — signs Soroban auth entries locally, never exposes the seed.
  const signer = createEd25519Signer(AGENT_A_SECRET, NETWORK);
  const client = new x402Client().register(NETWORK, new ExactStellarScheme(signer));
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log(`[Agent A] payer=${signer.address}  network=${NETWORK}  agents=${AGENTS_URL}`);

  // Hop 1: pay Agent B to scrape.
  console.log("[Agent A] → paying Agent B ($0.05) to scrape…");
  const scrapeRes = await fetchWithPayment(`${AGENTS_URL}/scrape?urls=stellar.org,circle.com`);
  if (!scrapeRes.ok) throw new Error(`scrape failed: ${scrapeRes.status} ${await scrapeRes.text()}`);
  const scraped = (await scrapeRes.json()) as { items: Array<{ url: string; headline: string }> };
  console.log(`[Agent A]   ✓ B returned ${scraped.items.length} item(s)`);

  // Hop 2: pay Agent C to summarize.
  console.log("[Agent A] → paying Agent C ($0.03) to summarize…");
  const sumRes = await fetchWithPayment(`${AGENTS_URL}/summarize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: scraped.items }),
  });
  if (!sumRes.ok) throw new Error(`summarize failed: ${sumRes.status} ${await sumRes.text()}`);
  const summary = (await sumRes.json()) as { summary: string };
  console.log(`[Agent A]   ✓ C summary: ${summary.summary}`);

  console.log("[Agent A] ✅ multi-hop x402 complete (A→B, A→C settled on Stellar).");
}

main().catch((e) => {
  console.error("[Agent A] error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
