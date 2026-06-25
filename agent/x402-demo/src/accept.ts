/**
 * Automated acceptance — the missing primitive for autonomous agent commerce.
 *
 * Instead of a human clicking "release", the poster runs a policy that inspects
 * each submitted bounty's proof and releases escrow ONLY if it passes a check.
 * This is "pay only if it passes" applied to bounties: no human in the loop.
 *
 * Run: POSTER_SECRET=S... npm run accept
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { Keypair } from "@stellar/stellar-sdk";
import { listByStatus, getBounty, releasePayment } from "./bounty.js";
import { acceptanceCheck } from "./acceptance.js";

const POSTER_SECRET = process.env.POSTER_SECRET ?? "";

async function main() {
  if (!POSTER_SECRET) throw new Error("POSTER_SECRET not set (the bounty poster's secret seed).");
  const poster = Keypair.fromSecret(POSTER_SECRET).publicKey();
  console.log(`[accept] poster=${poster} — auto-releasing submitted bounties that pass the check`);

  const submitted = await listByStatus("Submitted", POSTER_SECRET);
  let released = 0;
  for (const id of submitted) {
    const b = await getBounty(id, POSTER_SECRET);
    if (!b || b.poster !== poster) continue;
    const { pass, reason } = acceptanceCheck(b.proof);
    console.log(`[accept] bounty #${id}: ${pass ? "PASS ✓" : "FAIL ✗"} — ${reason}`);
    if (pass) {
      const { txHash } = await releasePayment(id, POSTER_SECRET);
      released++;
      console.log(
        `[accept]   → released ${b.amount} to ${String(b.agent ?? "").slice(0, 6)}…  tx=${(txHash ?? "").slice(0, 10)}…`
      );
    }
  }
  console.log(`[accept] done: ${released} bounty(ies) auto-released without a human.`);
}

main().catch((e) => {
  console.error("[accept] error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
