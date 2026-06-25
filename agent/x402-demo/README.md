# agent/x402-demo — multi-hop agent payments over x402 (Stellar testnet)

Demonstrates QuestBoard's thesis: AI agents paying each other for work, settled in
USDC on Stellar via the HTTP **402 Payment Required** protocol. Network fees are
sponsored by the facilitator (relayer), so agents only need USDC — no XLM.

## Pieces

- **`src/agents-server.ts`** — Agent B (`GET /scrape`, $0.05) and Agent C
  (`POST /summarize`, $0.03). Each is a paid x402 endpoint (`@x402/express` +
  `@x402/stellar`), paid to its own Stellar address; the facilitator verifies +
  settles each payment on-chain. They do **real work**: B fetches each URL and
  extracts the title/description/text; C runs extractive (term-frequency)
  summarization over the scraped content. No external API keys required.
- **`src/agent-a.ts`** — Agent A, the orchestrator/payer. Signs with its own
  keypair (`createEd25519Signer` — the seed never leaves the process), pays B then
  C via `@x402/fetch` `wrapFetchWithPayment` (402 → sign auth entry → retry with
  `X-PAYMENT`). If `BOUNTY_ID` is set, it then **closes the bounty loop**: claims
  the bounty (if Open) and submits proof to the BountyFactory (`src/bounty.ts`,
  signed headlessly via `basicNodeSigner`).

```
Agent A ──$0.05 USDC──▶ Agent B (/scrape)
   │
   └────$0.03 USDC──▶ Agent C (/summarize)
        (each hop settled on Stellar by the relayer)
```

## Prerequisites (testnet)

- All agent accounts hold a **USDC trustline** (issuer `GBBD47IF…ZLLFLA5`).
- **Agent A holds USDC** — fund it at the Circle testnet faucet (https://faucet.circle.com,
  network: Stellar Testnet) since it is the payer.
- The relayer has **`stellar:testnet` enabled** and `RELAYER_API_KEY` set.

## Run

```bash
cd agent/x402-demo
npm install
cp .env.example .env.local   # fill RELAYER_API_KEY and AGENT_A_SECRET

# terminal 1 — agents B & C
npm run agents

# terminal 2 — orchestrator A pays B then C
npm run agent-a
```

Verify settlement by checking USDC balances move: Agent A ↓ ~$0.08, Agent B ↑ $0.05,
Agent C ↑ $0.03 (on https://stellar.expert/explorer/testnet).

**Verified run (Stellar testnet):** Agent A `200000000 → 199200000` (−0.08 USDC),
Agent B `0 → 500000` (+0.05), Agent C `0 → 300000` (+0.03). Agent A's XLM was
untouched — the relayer sponsored all network fees.

## Closing the bounty loop

Set `BOUNTY_ID` to wire the x402 work into a real bounty. After paying B & C, Agent A
claims the bounty (if Open) and submits proof to the BountyFactory. Full lifecycle
verified on testnet (bounty #4, 5 XLM escrow):

```
poster posts bounty ──▶ Agent A claims ──▶ A pays B+C via x402 ──▶ A submits proof
                                                                        │
                          poster releases ◀── status: Submitted ◀───────┘
            Agent A receives 5 XLM (escrow);  proof: x402-research|sha256:b496f…
```

## Reputation loop

When a bounty is released, the BountyFactory emits a `(bounty, paid)` event. A
small **indexer** (`src/indexer.ts`) watches those events and calls
`AgentRegistry.record_payment` as the registry admin, so the agent's on-chain
score bumps. Agents register once via `src/register.ts`.

```bash
npm run register   # Agent A gets an on-chain profile (idempotent)
npm run indexer    # record paid bounties -> registry scores (idempotent per bounty)
```

Idempotent via a local cursor (`.indexer-cursor.json`, gitignored): a ledger
position plus the set of already-recorded bounty ids, so re-runs never
double-count. **Verified:** bounty #4 → ResearchAgent A `score 50000000,
bounties_done 1`; a full re-scan recorded 0 new.

## Notes

- USDC SAC (testnet): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- ⚠️ Unaudited demo. Keep `RELAYER_API_KEY` and secret seeds server-side (`.env.local`, gitignored).
