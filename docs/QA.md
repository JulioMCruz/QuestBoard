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

## Demo-readiness notes

- **Re-seed fresh bounties before the demo.** The current demo bounties were seeded earlier with
  short deadlines and now display "Expires in 0h". Re-run `scripts/seed.sh` so the board looks
  fresh.
- **Testnet can be briefly slow.** A submission may time out and need a retry — not a contract
  issue, just network latency. Worth a one-retry buffer during a live demo.
- **State is eventually consistent.** Reading immediately after a write can briefly return the
  previous value; the UI's auto-refresh handles this, but confirm the post-action refresh after a
  signed transaction.

## Test runner — cross-platform note

`scripts/test.sh` resolves the Python venv as `.venv/bin/python` (POSIX). On Windows the venv is
`.venv/Scripts/python.exe`, so the `mcp` suite is reported as failed there even though it passes
(10/10) when invoked directly. A small OS-detection tweak would make the runner cross-platform.

## Not yet covered

- **Human wallet flow** — posting / claiming / releasing through the UI with Freighter signing.
- **x402 multi-hop payments** (orchestrator pays scraper + summarizer) — needs a `RELAYER_API_KEY`
  and USDC; covered by `agent/x402-demo` but not re-verified in this pass.
- **Automated acceptance** (`agent/x402-demo/src/accept.ts`) and the **reputation indexer**
  (`src/indexer.ts`) against a live run.
- **Live smokes**: `scripts/test-contracts.sh --testnet`, `scripts/test-endpoints.sh` (402 paywall).
