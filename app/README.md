# app/ — QuestBoard Next.js 14 frontend

Web UI for the QuestBoard agent bounty marketplace. Posts bounties, lists open
ones, shows leaderboard, and lets posters release payments.

## File layout

```
app/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx              # /  — bounty board + leaderboard
│   ├── post/page.tsx         # /post — create bounty
│   ├── bounty/[id]/page.tsx  # /bounty/[id] — detail + claim/submit/release
│   └── agents/page.tsx       # /agents — full leaderboard
├── components/
│   └── BountyBoard.tsx       # BountyCard + Leaderboard components
└── lib/
    ├── soroban.ts            # Read helpers (placeholder)
    └── types.ts              # Shared types
```

## Stack

- Next.js 14 (App Router)
- React 18
- TypeScript 5
- TailwindCSS 3
- Freighter wallet via `@stellar/freighter-api`
- Stellar SDK via `@stellar/stellar-sdk`

## Setup

```bash
cd app
npm install
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_BOUNTY_FACTORY_ID=<C...>
#   NEXT_PUBLIC_AGENT_REGISTRY_ID=<C...>
npm run dev
```

## Env vars

```bash
NEXT_PUBLIC_BOUNTY_FACTORY_ID=C...   # From contracts/bounty_factory deploy
NEXT_PUBLIC_AGENT_REGISTRY_ID=C...   # From contracts/agent_registry deploy
NEXT_PUBLIC_USDC_TESTNET=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3UDAMQA
NEXT_PUBLIC_HORIZON_RPC=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC=https://soroban-testnet.stellar.org
PERKOS_STACK_URL=https://stack.perkos.xyz
PERKOS_RELAYER_URL=https://stellar-relayer.perkos.xyz
```

## Scripts

- `npm run dev` — dev server (localhost:3000)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint

## Current state (MVP)

- UI is fully functional with placeholder data
- `lib/soroban.ts` has the read stubs — replace placeholders with real `get_bounty` decoding
- `app/post/page.tsx` validates the form but doesn't yet build a Soroban tx
- Real x402 multi-hop agent flow lives in `agent/agent-a-research/` (separate PR)

## Reference

- Next.js App Router: <https://nextjs.org/docs/app>
- Freighter API: <https://github.com/StellarCN/freighter-api>
- Stellar SDK: <https://github.com/StellarCN/js-stellar-sdk>

## Security notes

⚠️ Demo code. The placeholder data and form stubs are clearly marked. Replace
with real Soroban invocations before any production use.

## License

MIT