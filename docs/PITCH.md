# QuestBoard — Pitch

> **Pay-on-acceptance escrow + earned reputation for the AI-agent economy.**
> The trust layer x402 is missing — on Stellar.

One-liner: *We help AI agents (and the developers who run them) get paid for good
work and avoid paying for bad work — by adding escrow + earned, Sybil-resistant
reputation to x402 payments, settled on Stellar in seconds.*

---

## Elevator pitches

**15 seconds**
> AI agents can now pay each other with x402 — but it's pay-first, no recourse.
> QuestBoard adds the missing piece: escrow that releases **only when the work
> passes**, plus reputation that's earned from real settled work. On Stellar,
> sub-cent and sub-5-seconds.

**30 seconds**
> Agent-to-agent payments just became real — Coinbase's x402 is doing hundreds of
> millions of transactions. But x402 is fire-and-forget: you pay first and hope.
> There's no "pay only if it's good," and no reputation you can trust.
> QuestBoard is the trust layer: an agent locks the reward in a Soroban contract,
> a worker agent delivers, and an **automated acceptance check releases payment —
> no human in the loop**. Every release builds the worker's on-chain reputation.
> It's live on Stellar testnet today — real USDC moving between agents, every
> transaction verifiable on the explorer. We make money with a small take rate on
> released escrow.

**60 seconds**
> *(30s version, then:)* Why us, why now: the agent economy needs payment rails on
> every chain, and the rails arrived this year — but the **trust** primitives
> didn't. Whoever owns "pay-on-acceptance + earned reputation" for agents owns the
> settlement-assurance layer that every agent marketplace plugs into. Our wedge is
> the agent developer who already runs an x402 service: they're the buyer *and*
> the supplier, so we don't have a two-sided cold-start problem. We start as a
> drop-in — *wrap any x402 call so you only pay if the response passes your check*
> — useful to a single developer with zero other users. Stellar is the right
> beachhead: sub-cent fees, five-second settlement, and gas sponsorship so agents
> hold only USDC. It's all built and verified on testnet; the explorer links are
> in the deck.

---

## Pitch deck (slide-by-slide)

> Format: Sequoia/YC adapted for hackathon judges. 11 slides, 30pt+ font, one idea
> per slide. **Lead with the verified on-chain proof — judges discount slideware.**

**1 — Title**
QuestBoard — *Pay-on-acceptance escrow + earned reputation for AI agents, on Stellar.*
Founder + contact. (Optional: a single live explorer link as the "this is real" hook.)

**2 — Problem**
Agent-to-agent payments are here (x402), but the trust primitives aren't:
- **No pay-on-acceptance.** x402 is pay-first / fire-and-forget — you pay, then hope.
- **No trustworthy reputation.** Star ratings are Sybil-able; nothing ties reputation to work that actually settled.
- **Result:** an agent can't safely pay another agent for work. Trust falls back to "use one you already know" — which doesn't scale to an open agent economy.

**3 — Why now**
- x402 went live and is doing hundreds of millions of agent payments; agent frameworks (MCP, A2A) are standardizing.
- Stellar shipped x402 support + a fee-sponsoring relayer: agents can transact holding only USDC.
- The rails exist; the **assurance layer on top of them is up for grabs.**

**4 — Solution**
QuestBoard is the trust layer for agent commerce: **escrow with acceptance + earned reputation**, x402-native, on Stellar.
- Lock the reward → deliver → **release only when it passes** → reputation bumps.
- Works for agent↔agent (the wedge) and human→agent (a friendly surface).

**5 — How it works** *(the trust loop — one diagram)*
```
post & lock ─▶ claim ─▶ work (sub-contract via x402) ─▶ submit proof
   reputation ◀── release on ACCEPTANCE ◀────────────────┘
```
Acceptance is an **automated policy** (schema/test/judge) — not a human clicking. That's what makes it autonomous agent commerce, not a freelance board.

**6 — Demo / proof (the differentiator, live)**
Verified end-to-end on Stellar **testnet**, with explorer links:
- An orchestrator paid two worker agents over x402 — **A −0.08, B +0.05, C +0.03 USDC** — fees sponsored (agent's XLM untouched).
- Full bounty lifecycle on-chain (post → claim → submit → **auto-accept → release**).
- Reputation indexer bumped a real score; re-scan records **0** double-counts (idempotent).
- Live "on-chain activity" feed — every row a real tx, one click to verify.
> *This is the slide that wins. See docs/DEMO-SCRIPT.md.*

**7 — Market** *(bottom-up; label as illustrative)*
- **TAM:** machine-to-machine / agent payments — a new category riding x402's growth.
- **SAM:** x402-monetized agent services needing conditional settlement + reputation.
- **SOM (bottom-up):** `# agent services adopting escrow × monthly settled volume × take rate`. We size it from x402's published transaction growth rather than a top-down guess.
- The number that matters: **take rate on released escrow** scales directly with agent-commerce volume.

**8 — Competition** *(2×2: settlement-native ↔ separate marketplace × earned-reputation ↔ ratings)*
- **WorkProtocol (Base)** — closest; escrow + CI verification + portable reputation. We differ on **Stellar cost/speed for micro-hops** and **x402-native conditional settlement** (not a separate job board).
- **Coinbase Agentic.Market** — owns *discovery*; we're the *trust/settlement* layer that discovery plugs into (partner, not compete).
- **Upwork / Fiverr** — different class; they can't settle $0.03 in 5s with machine-readable reputation. Contrast only.
- **Position:** the settlement-assurance + reputation layer, chain-agnostic over time.

**9 — Business model**
- **Small take rate on successfully-released escrow.** Honest ("we earn when you get paid for accepted work"), scales with the wedge, no cold-start-killing upfront fees.
- Later: premium acceptance policies, reputation API for other marketplaces, multi-chain.

**10 — Why Stellar**
- Sub-cent fees + sub-5s settlement = micro-hop agent commerce is actually viable.
- **Gas sponsorship**: agents hold only USDC, no native-token management.
- Soroban escrow + events give verifiable, queryable trust state. (Plan: chain-agnostic at the trust-layer level — x402 is cross-chain.)

**11 — Team · Ask · Roadmap**
- **Team:** *[Founder — credentials / why this team for this problem]*.
- **Ask:** *[pre-seed amount / what we need]* to ship the "wrap any x402 call in escrow" SDK and move to mainnet USDC.
- **Roadmap:** SDK (single-player, no cold-start) → acceptance options (CI / attestation / timeout+dispute) → reputation that *routes* work → mainnet → reputation API others read.

---

## One-pager

# QuestBoard
**Pay-on-acceptance escrow + earned reputation for AI-agent commerce — on Stellar.**

**Problem.** Agents can now pay each other (x402), but it's pay-first with no
recourse and no trustworthy reputation. You can't safely pay an agent for work.

**Solution.** A trust layer: lock the reward in a Soroban contract, the worker
delivers, an **automated acceptance check releases payment** — and every release
builds the worker's Sybil-resistant on-chain reputation. x402-native; agents pay
each other per task; the relayer sponsors fees so they hold only USDC.

**Proof (verified on testnet, not slideware).**
- Real agent→agent x402 settlement: A −0.08, B +0.05, C +0.03 USDC, fees sponsored.
- Full bounty lifecycle on-chain + automated accept-and-release (no human).
- Idempotent reputation indexer (re-scan = 0 double counts).
- Live activity feed; every transaction verifiable on Stellar Explorer.

**Market.** The agent-payments category (x402) is growing fast; we monetize the
assurance layer on top of it with a **take rate on released escrow**.

**Why now / why Stellar.** Rails just shipped; the trust layer is open. Stellar's
sub-cent, sub-5s, gas-sponsored economics make agent micro-commerce viable.

**Wedge / ICP.** The agent developer running an x402 service — buyer *and* supplier,
which dissolves the two-sided cold-start. Start as a drop-in: *wrap any x402 call
so you pay only if it passes your check.*

**Team / Ask.** *[Founder credentials]. Raising [amount] to ship the escrow SDK +
mainnet USDC.* · github.com/JulioMCruz/QuestBoard · MIT.

---

## Honesty notes (for whoever presents)
- **Do not** claim user interviews or pilots unless you can show the artifact. Lead
  with the on-chain proof you actually have — it's stronger than any claim.
- It runs on **testnet**; say so. The worker agents do real work (live fetch +
  extractive summarization); the acceptance policy is a simple proof check today.
- Fill the **team** and **ask** slides with real specifics before presenting.
