# Branch notes — QA verification + pitch deck + x402 fix

This branch bundles three independent workstreams into one PR to `main`. All work targets the
Stellar PULSO submission and was verified on Stellar **testnet**.

> Merging to `main` triggers the Vercel deploy, which makes **`/pitchdeck`** reachable for the
> submission.

## What's in here

### 1. QA — functional / end-to-end verification
Full write-up in [`docs/QA.md`](QA.md). Verified, all green on testnet:

- **Web UI** — every page renders live testnet data; no console errors.
- **On-chain bounty lifecycle** — `create → claim → submit → release → reputation`, checked
  on-chain (escrow locks, releases to the agent, reputation increments).
- **Human wallet flow (Freighter)** — post + refund signed in the browser, confirmed on-chain.
- **x402 multi-hop** — Agent A pays Agent B and C; settlements confirmed on-chain (fees sponsored).
- **Automated acceptance + reputation indexer** — the full "pay only if it passes" loop: a bounty
  is posted, an agent does x402 work and submits proof, an acceptance policy releases the escrow
  with no human, and the indexer records the payment to the agent's on-chain reputation (idempotent).
- **Testnet smoke + MCP ABI tests** pass.

### 2. Pitch deck — `/pitchdeck`
Details in [`docs/PITCHDECK.md`](PITCHDECK.md). A self-contained, full-viewport slide deck for the
submission:

- 9 slides; navigate by clicking left/right, arrow keys, or the progress dots; a subtle ✕ returns home.
- `robots: noindex` (kept out of search engines) and linked from the nav as **"Learn more"**.

### 3. x402 reliability fix
`agent/x402-demo/src/agent-a.ts`. The orchestrator paid two agents back-to-back and the **second
consecutive settlement** from the same payer intermittently returned `402` (a relayer race). Fix: a
brief delay between hops (`HOP_DELAY_MS`, default 3500 ms). Verified — 3/3 consecutive multi-hop
runs settle both hops, and the full end-to-end loop runs reliably.

### 4. Test runner — cross-platform
`scripts/test.sh` now resolves the Python venv as `Scripts/` on Windows and `bin/` elsewhere, so the
`mcp` (pytest) suite runs on Windows too. The runner reports all four suites green.

## Files changed

| File | Area |
|---|---|
| `scripts/test.sh` | cross-platform test runner |
| `agent/x402-demo/src/agent-a.ts` | x402 second-hop delay fix |
| `app/app/pitchdeck/page.tsx`, `app/app/pitchdeck/PitchDeck.tsx` | pitch deck page |
| `app/components/SiteHeader.tsx` | "Learn more" nav link |
| `docs/QA.md` | QA verification report |
| `docs/PITCHDECK.md` | pitch-deck notes |
| `docs/BRANCH-NOTES.md` | this overview |

## Verify locally

```bash
# all automated suites (contracts + agent + app + mcp)
./scripts/test.sh

# the web app (incl. /pitchdeck) — from app/
npm install && npm run dev      # http://localhost:3000  ·  /pitchdeck

# x402 multi-hop (needs agent/x402-demo/.env.local with relayer key + agent secrets)
cd agent/x402-demo
npm run agents                  # terminal 1: paid agents B & C
npm run agent-a                 # terminal 2: orchestrator pays B then C
```

## Not in scope here
- Customer-discovery interviews (a separate submission requirement).
- The demo video.
