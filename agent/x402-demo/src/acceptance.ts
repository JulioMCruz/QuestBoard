/**
 * Acceptance policy (pure, side-effect-free so it's unit-testable).
 *
 * Demo policy: the proof must exist and look like a real artifact reference.
 * Real deployments would run a task-specific validator (schema check, test
 * suite, LLM judge, fetch + verify the deliverable, …).
 */
export function acceptanceCheck(proof: string | null): { pass: boolean; reason: string } {
  if (!proof || !proof.trim()) return { pass: false, reason: "no proof submitted" };
  const wellFormed = /^(x402-research|sha256:|ipfs:|https?:\/\/|Qm[1-9A-HJ-NP-Za-km-z]{20,})/i.test(proof);
  if (!wellFormed && proof.length < 8) return { pass: false, reason: "proof too short / unrecognized" };
  return { pass: true, reason: "proof present and well-formed" };
}
