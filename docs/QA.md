# QA — Functional / End-to-End Verification

Companion to [TESTING.md](TESTING.md). TESTING.md covers the automated suites (how to run them);
this doc records the **functional, end-to-end verification** of the real user flows: does the
running app read live state, and do the contracts execute the full lifecycle on testnet?

Last run: 2026-06-29 (Stellar testnet).

## Layer 1 — Web UI (live reads) — ✅ pass

Walked the running app (`http://localhost:3000`) page by page. Every page renders **live testnet
data** with **no console errors**.

| Page | Verified |
|---|---|
| Landing `/` | Live stats (active bounties, XLM in escrow, agents) + recent bounties |
| Agents `/agents` | Reputation leaderboard from `AgentRegistry`, sorted by score |
| Agent detail `/agents/[address]` | Dynamic route: score, bounties completed, x402 endpoint |
| Dashboard `/dashboard` | Role-aware; bounty list by status with correct labels; on-chain activity feed |
| Bounty detail `/bounty/[id]` | Title, amount, status, poster/agent, Stellar Explorer link |
| Post `/post` | Form renders; dynamic "X XLM will be locked" summary |

## Layer 2 — On-chain lifecycle (headless) — ✅ pass

Ran the full bounty lifecycle on testnet against freshly deployed instances of the contracts,
end to end. Each step verified by reading on-chain state.

| Step | Verified on-chain |
|---|---|
| `create_bounty` | Bounty `Open`; reward locked in escrow (exact amount) |
| `claim_bounty` | Status → `Claimed`; agent recorded |
| `submit_proof` | Status → `Submitted`; proof hash stored |
| `release_payment` | Status → `Released`; full reward transferred to the agent; escrow emptied |
| `register` + `record_payment` | `(agent, paid)` event emitted; agent score + `bounties_done` incremented; leaderboard updated (idempotent — no double-count) |

The escrow correctly holds funds until acceptance and releases the full amount only after the
agent submits proof. Reputation reflects exactly the settled work.

## Layer 3 — Human wallet flow (Freighter) — ✅ pass

Drove the full human signing flow in the browser against the live testnet contracts.

| Step | Verified on-chain |
|---|---|
| Post a bounty (Freighter sign) | Bounty created (1 XLM escrowed); app redirected to the new bounty |
| Refund (Freighter sign) | Status → `Refunded`; the 1 XLM returned to the wallet; UI showed "Refunded to you" |

## Layer 4 — x402 multi-hop (agent-to-agent payments) — ✅ works, with a reliability note

Ran the orchestrator (`agent/x402-demo`): Agent A pays Agent B to scrape and Agent C to summarize,
each a paid HTTP-402 endpoint settled in USDC by the relayer (network fees sponsored).

- **Paywall enforced** — both endpoints return `402` with valid payment requirements (decoded the
  `PAYMENT-REQUIRED` header: exact scheme, USDC, payTo, testnet, fees sponsored).
- **Settlement works on-chain** — a full multi-hop run settled both hops: **Agent B +$0.05** and
  **Agent C +$0.03** (confirmed via on-chain USDC balances), and the orchestrator logged
  "multi-hop x402 complete (A→B, A→C settled on Stellar)."

### ⚠️ Finding — the second consecutive hop is intermittent

The first runs reproducibly returned `402` on the **second** hop (the A→C payment); a later run
succeeded. Isolated with a probe: **paying C alone always succeeds**, so the failure is tied to
being the *second consecutive settlement from the same payer*, not the POST endpoint. Most likely a
transient race (nonce / sequence) at the relayer when one payer settles two payments back-to-back.

**Fix applied (`fix/x402-retry`):** a brief delay between the two settlements (`HOP_DELAY_MS`,
default 3500ms) so the second hop doesn't race the first. Verified — 3/3 consecutive multi-hop runs
completed both hops with no 402.

### Full "pay only if it passes" loop — ✅ verified end-to-end

Ran the complete killer flow on the live contracts: post a bounty → Agent A pays B+C over x402 and
submits proof → **automated acceptance** (`accept.ts`) releases the escrow with **no human** →
**reputation indexer** (`indexer.ts`) records the payment. Result: bounty #10 released to Agent A;
ResearchAgent A's on-chain score **5 → 6 XLM** and `bounties_done` **1 → 2**; re-running the indexer
records 0 (idempotent).

## Demo-readiness notes

- **Re-seed fresh bounties before the demo.** The current demo bounties were seeded earlier with
  short deadlines and now display "Expires in 0h". Re-run `scripts/seed.sh` so the board looks
  fresh.
- **Testnet can be briefly slow.** A submission may time out and need a retry — not a contract
  issue, just network latency. Worth a one-retry buffer during a live demo.
- **State is eventually consistent.** Reading immediately after a write can briefly return the
  previous value; the UI's auto-refresh handles this, but confirm the post-action refresh after a
  signed transaction.
- **x402 multi-hop fixed.** The second-hop 402 race is resolved by a delay between settlements
  (`fix/x402-retry`, `HOP_DELAY_MS`); verified reliable across consecutive runs.

## Test runner — cross-platform note

`scripts/test.sh` resolves the Python venv as `.venv/bin/python` (POSIX). On Windows the venv is
`.venv/Scripts/python.exe`, so the `mcp` suite is reported as failed there even though it passes
(10/10) when invoked directly. A small OS-detection tweak would make the runner cross-platform.

## Not yet covered

- Claiming / submitting through the **web UI** with a second (agent) wallet — the claim/submit
  transitions were verified headless (Layer 2) and via the agent runtime, not via Freighter in the
  browser.
