/**
 * Reputation indexer.
 *
 * Watches the BountyFactory for `(bounty, paid)` events (emitted on
 * release_payment) and calls AgentRegistry.record_payment(agent, amount) as the
 * registry admin, so each completed bounty bumps the agent's on-chain score.
 *
 * Idempotent across runs via a local ledger cursor (.indexer-cursor.json).
 * Run: npm run indexer   (ADMIN_SECRET must be the registry admin)
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { recordPayment, getAgent } from "./registry.js";

const RPC_URL = process.env.SOROBAN_RPC ?? "https://soroban-testnet.stellar.org";
const BOUNTY_FACTORY_ID = process.env.BOUNTY_FACTORY_ID ?? "";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const CURSOR_FILE = ".indexer-cursor.json";
// Default look-back if no cursor yet (~11h at 5s/ledger). Override with INDEXER_START_LEDGER.
const DEFAULT_LOOKBACK = 8000;

type Cursor = { lastLedger: number | null; processed: Set<number> };

function loadCursor(): Cursor {
  if (!existsSync(CURSOR_FILE)) return { lastLedger: null, processed: new Set() };
  try {
    const j = JSON.parse(readFileSync(CURSOR_FILE, "utf8"));
    return { lastLedger: j.lastLedger ?? null, processed: new Set<number>(j.processed ?? []) };
  } catch {
    return { lastLedger: null, processed: new Set() };
  }
}
function saveCursor(c: Cursor) {
  writeFileSync(
    CURSOR_FILE,
    JSON.stringify({ lastLedger: c.lastLedger, processed: [...c.processed].sort((a, b) => a - b) }, null, 2) + "\n"
  );
}

async function main() {
  if (!BOUNTY_FACTORY_ID) throw new Error("BOUNTY_FACTORY_ID not set");
  if (!ADMIN_SECRET) throw new Error("ADMIN_SECRET not set (must be the registry admin)");

  const server = new rpc.Server(RPC_URL);
  const latest = (await server.getLatestLedger()).sequence;
  const envStart = process.env.INDEXER_START_LEDGER ? Number(process.env.INDEXER_START_LEDGER) : null;
  const cursor = loadCursor();
  const startLedger =
    envStart ?? (cursor.lastLedger ? cursor.lastLedger + 1 : Math.max(1, latest - DEFAULT_LOOKBACK));
  console.log(`[indexer] scanning BountyFactory paid events from ledger ${startLedger} (latest ${latest})`);

  let processed = 0;
  let recorded = 0;
  let maxLedger = startLedger - 1;
  let pageCursor: string | undefined;

  for (;;) {
    const params: any = pageCursor
      ? { cursor: pageCursor, filters: [{ type: "contract", contractIds: [BOUNTY_FACTORY_ID] }], limit: 100 }
      : { startLedger, filters: [{ type: "contract", contractIds: [BOUNTY_FACTORY_ID] }], limit: 100 };
    const resp: any = await server.getEvents(params);
    const events: any[] = resp.events ?? [];

    for (const ev of events) {
      if (typeof ev.ledger === "number") maxLedger = Math.max(maxLedger, ev.ledger);
      const topics = (ev.topic ?? []).map((t: any) => {
        try {
          return scValToNative(t);
        } catch {
          return null;
        }
      });
      if (topics[1] !== "paid") continue; // (bounty, paid)
      processed++;

      const [bountyId, agent, amount] = scValToNative(ev.value) as [bigint, string, bigint];
      const bid = Number(bountyId);
      if (cursor.processed.has(bid)) {
        console.log(`[indexer] bounty ${bid}: already recorded — skipping`);
        continue;
      }
      const profile = await getAgent(agent, ADMIN_SECRET);
      if (!profile) {
        console.log(`[indexer] bounty ${bid}: agent ${agent.slice(0, 6)}… not registered — skipping`);
        continue;
      }
      await recordPayment(ADMIN_SECRET, agent, amount);
      cursor.processed.add(bid);
      recorded++;
      console.log(`[indexer] bounty ${bid}: recorded +${amount} for ${profile.name} (${agent.slice(0, 6)}…)`);
    }

    if (!resp.cursor || events.length === 0) break;
    pageCursor = resp.cursor;
  }

  cursor.lastLedger = Math.max(maxLedger, latest);
  saveCursor(cursor);
  console.log(`[indexer] done: ${processed} paid event(s) seen, ${recorded} recorded. cursor -> ${Math.max(maxLedger, latest)}`);
}

main().catch((e) => {
  console.error("[indexer] error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
