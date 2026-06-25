# agent/x402-demo — multi-hop agent payments over x402 (Stellar testnet)

Demonstrates QuestBoard's thesis: AI agents paying each other for work, settled in
USDC on Stellar via the HTTP **402 Payment Required** protocol. Network fees are
sponsored by the facilitator (relayer), so agents only need USDC — no XLM.

## Pieces

- **`src/agents-server.ts`** — Agent B (`GET /scrape`, $0.05) and Agent C
  (`POST /summarize`, $0.03). Each is a paid x402 endpoint (`@x402/express` +
  `@x402/stellar`), paid to its own Stellar address. The facilitator verifies +
  settles each payment on-chain.
- **`src/agent-a.ts`** — Agent A, the orchestrator/payer. Signs with its own
  keypair (`createEd25519Signer` — the seed never leaves the process), pays B then
  C via `@x402/fetch` `wrapFetchWithPayment` (402 → sign auth entry → retry with
  `X-PAYMENT`).

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

## Notes

- USDC SAC (testnet): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- ⚠️ Unaudited demo. Keep `RELAYER_API_KEY` and secret seeds server-side (`.env.local`, gitignored).
