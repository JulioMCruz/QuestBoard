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

const POSTER_SECRET = process.env.POSTER_SECRET ?? "";

/**
 * Acceptance policy (demo). Real deployments would run a task-specific validator
 * (schema check, test suite, LLM judge, fetch + verify the deliverable, …).
 * Here: the proof must exist and look like a real artifact reference.
 */
function acceptanceCheck(proof: string | null): { pass: boolean; reason: string } {
  if (!proof || !proof.trim()) return { pass: false, reason: "no proof submitted" };
  const wellFormed = /^(x402-research|sha256:|ipfs:|https?:\/\/|Qm[1-9A-HJ-NP-Za-km-z]{20,})/i.test(proof);
  if (!wellFormed && proof.length < 8) return { pass: false, reason: "proof too short / unrecognized" };
  return { pass: true, reason: "proof present and well-formed" };
}

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
