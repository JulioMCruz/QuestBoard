/**
 * Register Agent A in the AgentRegistry so it has an on-chain profile and can
 * accrue reputation. Idempotent — safe to run more than once.
 *
 * Run: npm run register
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { registerAgent } from "./registry.js";

const AGENT_A_SECRET = process.env.AGENT_A_SECRET ?? "";

async function main() {
  if (!AGENT_A_SECRET) throw new Error("AGENT_A_SECRET not set");
  const r = await registerAgent(
    AGENT_A_SECRET,
    process.env.AGENT_A_NAME ?? "ResearchAgent A",
    process.env.AGENTS_URL ?? "http://localhost:4021",
    "Orchestrator: claims bounties and subcontracts B/C via x402"
  );
  console.log(
    r.alreadyRegistered
      ? `[register] ${r.address} already registered`
      : `[register] ✓ registered ${r.address}`
  );
}

main().catch((e) => {
  console.error("[register] error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
