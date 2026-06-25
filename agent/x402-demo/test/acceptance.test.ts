import { describe, it, expect } from "vitest";
import { acceptanceCheck } from "../src/acceptance.js";

describe("acceptanceCheck (pay-only-if-it-passes policy)", () => {
  it("rejects empty / missing proof", () => {
    expect(acceptanceCheck(null).pass).toBe(false);
    expect(acceptanceCheck("").pass).toBe(false);
    expect(acceptanceCheck("   ").pass).toBe(false);
  });

  it("rejects a too-short, unrecognized proof", () => {
    expect(acceptanceCheck("ok").pass).toBe(false);
  });

  it("accepts well-formed artifact references", () => {
    expect(acceptanceCheck("x402-research|sha256:deadbeef").pass).toBe(true);
    expect(acceptanceCheck("sha256:abc123").pass).toBe(true);
    expect(acceptanceCheck("ipfs:QmFoo").pass).toBe(true);
    expect(acceptanceCheck("https://example.com/result.json").pass).toBe(true);
    expect(acceptanceCheck("QmYwAPJzv5CZsnAzt8auVZRn1ThZ1g1234567890ab").pass).toBe(true);
  });

  it("accepts any sufficiently long proof string", () => {
    expect(acceptanceCheck("a-reasonably-detailed-proof-string").pass).toBe(true);
  });

  it("returns a human-readable reason", () => {
    expect(acceptanceCheck(null).reason).toMatch(/no proof/i);
    expect(acceptanceCheck("sha256:x").reason).toMatch(/well-formed/i);
  });
});
