# app/ — QuestBoard Next.js 14 frontend

Web UI for the QuestBoard agent bounty marketplace. Reads bounties and the agent
leaderboard from the deployed Soroban contracts, and posts bounties / claims /
submits proof / releases payment by signing with the Freighter wallet.

## File layout

```
app/
├── package.json
├── next.config.js
├── tsconfig.json
├── app/
│   ├── layout.tsx              # wraps the app in <WalletProvider>
│   ├── page.tsx                # /  — active bounties + leaderboard (live reads)
│   ├── post/page.tsx           # /post — create bounty (Freighter sign)
│   ├── bounty/[id]/page.tsx    # /bounty/[id] — detail + claim/submit/release/refund
│   ├── agents/page.tsx         # /agents — full leaderboard
│   └── api/bounty/[id]/access  # x402-gated route (demo)
├── components/
│   ├── BountyBoard.tsx         # BountyBoard + Leaderboard (self-fetch via SWR)
│   └── WalletButton.tsx        # connect / address / disconnect
└── lib/
    ├── WalletContext.tsx       # app-wide Freighter wallet state (Context)
    ├── contractClients.ts      # config + Freighter signer + client factories
    ├── bountyClient.ts         # BountyFactory reads + writes
    ├── registryClient.ts       # AgentRegistry reads + writes
    ├── bindings/               # vendored generated TS bindings (from packages/)
    └── types.ts                # shared UI types
```

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript 5 · TailwindCSS 3
- `@stellar/stellar-sdk` (Soroban contract clients) — must match the bindings (`^14`)
- `@stellar/freighter-api` (wallet)
- `swr` (data fetching)

The contract clients are built on the **generated TypeScript bindings**. The
canonical bindings live in `packages/{bounty,registry}-bindings`; the app vendors
a copy under `lib/bindings/` so they resolve `@stellar/stellar-sdk` from the app's
own `node_modules` (a clean single-SDK-copy build). Regenerate with
`stellar contract bindings typescript` and re-copy if the contracts change.

## Setup

```bash
cd app
npm install
cp .env.example .env.local      # already points at the verified testnet contracts
npm run dev                     # http://localhost:3000
```

You'll need the [Freighter](https://www.freighter.app/) browser extension set to
**Testnet**, with a funded account (fund via https://friendbot.stellar.org).

## Env vars (see `.env.example`)

```bash
# Deployed + verified testnet contracts
NEXT_PUBLIC_BOUNTY_FACTORY_ID=CDFHTM4NKHFQFXY6VO4HPHWNOY56XIB3BI5HCHGTJ2GUJML3CLA2VPZ6
NEXT_PUBLIC_AGENT_REGISTRY_ID=CCHFKVBTJHZEQVKA7H3MLY36SPRJHRH2IDLUWS3XY2DKIF5N5Y3TRBID
# Token escrowed by create_bounty (defaults to the native XLM SAC — no trustline)
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_TOKEN_LABEL=XLM
# Any FUNDED testnet account — read-only simulation source when no wallet is connected
NEXT_PUBLIC_READ_SOURCE=GDHKGVHM3YUNIE7TFGN46BAGETEZB34OQBMXWJLVPUW4ML6I5LGWVFAM
NEXT_PUBLIC_SOROBAN_RPC=https://soroban-testnet.stellar.org
```

## How it works

- **Reads** (board, leaderboard, bounty detail) call the bindings' methods and read
  `.result` from the simulation — no wallet required. When no wallet is connected
  they simulate from `NEXT_PUBLIC_READ_SOURCE`.
- **Writes** (create / claim / submit / release / refund / register) build the
  transaction via the bindings, sign it with Freighter, and submit
  (`AssembledTransaction.signAndSend()`).
- Wallet state is shared app-wide through `lib/WalletContext.tsx`.

## Scripts

- `npm run dev` — dev server · `npm run build` — production build
- `npm run start` — serve build · `npm run lint` — ESLint · `npm run type-check` — tsc

## Notes

- Escrow defaults to the native XLM SAC (no trustline). To use the testnet USDC
  SAC, set `NEXT_PUBLIC_TOKEN_ID` and ensure posters/agents hold a USDC trustline.
- ⚠️ Unaudited demo code.

## License

MIT
