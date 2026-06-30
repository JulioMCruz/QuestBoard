# QuestBoard — Demo video guide (current UI)

Deep analysis of the app + a screen-by-screen workflow to record. Everything below
is **real on Stellar testnet** — every write signs with Freighter and submits to the
deployed `BountyFactory` / `AgentRegistry` contracts; the activity feed and receipts
link to Stellar Explorer. Nothing in the core flow is mocked.

> Supersedes the terminal-only `DEMO-SCRIPT.md` for a UI-led video.

---

## 1. What the app actually is (deep analysis)

A web app (Next.js 14, App Router) + a chat agent (Hermes) over the same contracts.
Design language: "cozy-mystic voxel" — ink/glow/gold palette, glassmorphism, custom
art (`hero.mp4`, quest icons, banners), framer-motion / gsap / lenis motion.

**Routes (nav: Dashboard · Agents · Hermes · Learn more):**

| Route | What it is | Real on-chain? |
|---|---|---|
| `/` | Landing: animated hero + **"Live on the board"** (real open bounties) + How-it-works | Reads live bounties |
| `/board` | The Quest Board — paginated grid of `QuestCard`s (Open/Claimed/Submitted) | Live reads |
| `/post` | Post form: title, description, category icon, amount, deadline + escrow explainer | **Write** (locks funds) |
| `/bounty/[id]` | The lifecycle hub — status-driven actions, ConfirmModals, X402 explainer, Explorer links | **Writes** (claim/submit/release/refund) |
| `/dashboard` | Role-aware (poster/agent) panels, stats, **Live on-chain activity feed** | Live reads + events |
| `/hermes` | **Interactive console** — the `/questboard` slash commands run live in the browser | **Writes** via Freighter |
| `/agents` | Reputation **leaderboard** + register agent | Live reads |
| `/pitchdeck` | Full-screen standalone pitch deck ("Learn more") | — |

**The contracts layer (what makes it real):** `lib/bountyClient.ts` does reads via
simulation and writes via `signAndSend()` (Freighter), returning the tx hash for a
receipt link. Status drives the UI: `Open → Claim`, `Claimed → Submit proof`,
`Submitted → Release` (poster only), plus refund. The **activity feed**
(`lib/activity.ts`) reads contract events + the USDC x402 transfers and links each to
Explorer.

**Three ways to drive the exact same on-chain flow** — pick per scene:
1. **The UI** (`/post`, `/bounty/[id]`) — most visual, best for the main shots.
2. **The Hermes console** (`/hermes`) — `/questboard post/claim/submit/release`, live.
3. **The x402 agent runtime** (`agent/x402-demo`) — an autonomous agent that claims,
   **sub-contracts two other agents over x402** (real scrape + summarize), and submits.

---

## 2. The workflow to show — "the trust loop, end to end"

Tell one story: **a human posts a task with the reward locked in escrow; an AI agent
does it; the human approves; payment releases and the agent's reputation ticks up —
all on-chain, verifiable on Explorer.** That single loop demonstrates escrow +
pay-on-acceptance + reputation + Stellar speed in one breath.

Two ways to play the "agent does it" middle — choose by how much wow vs. control you want:
- **A — Clean UI (recommended for a first video):** you act as both poster and agent
  (two Freighter accounts). Fully in the browser, nothing can go wrong live.
- **B — Autonomous agents (the wow):** the x402 runtime claims + does *real* work and
  submits by itself. Strongest thesis, needs the agents running.

---

## 3. Pre-recording setup (do this first)

1. **Two Freighter accounts on Testnet**, both funded via friendbot:
   - **Poster** (you post + release) · **Agent** (claims + submits).
   - Freighter → switch network to **Test Net**; fund each at https://friendbot.stellar.org.
2. **Seed a few bounties** so the board isn't empty: `cd contracts && ./scripts/seed.sh`
   (or there are already Open bounties — #6, #7, #8, #10 at last check).
3. **App:** use production https://questboard-ochre.vercel.app *(latest `main`, public)*,
   or run locally: `cd app && npm run dev`.
4. **Explorer tab** open: https://stellar.expert/explorer/testnet
5. *(Variant B only)* Agents ready: `cd agent/x402-demo && npm install`, then in two
   terminals `npm run agents` and (after posting) `BOUNTY_ID=<id> npm run agent-a`;
   optional `npm run accept` to auto-release. `.env.local` already has the keys.
6. Record at **1920×1080**, hide bookmarks, zoom the browser to ~110% so text reads.

---

## 4. Screen-by-screen script (~2.5 min)

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00–0:18 | **`/` landing** | Let the hero play; scroll to **"Live on the board"** (real bounties) and "How it works". Point at the **TESTNET** badge. | "QuestBoard is a trust layer for AI-agent work: post a task, the reward is locked in escrow on Stellar, an agent does it, you approve, it pays out — and the agent earns on-chain reputation. Everything you'll see is live on testnet." |
| 0:18–0:50 | **`/post`** (Poster) | Connect Freighter (Poster). Fill *"Summarize 3 Stellar blog posts"*, pick a category icon, **2 XLM**, 24h. Read the escrow line. Click **Post & Lock Funds** → approve in Freighter. | "I post a bounty and the 2 XLM is **locked the moment I post** — protected, and only I can release it. Watch Freighter sign the real transaction." |
| 0:50–1:00 | **`/bounty/[id]`** | Land on the new bounty (toast w/ tx link). Show status **Open**, the escrow line, the X402 explainer, the **View contract on Explorer** link. | "There it is on-chain — status Open, funds in escrow. Here's the receipt and the contract on Stellar Explorer." |
| 1:00–1:35 | **Agent does the work** | **A:** switch Freighter to Agent → on the bounty, **Claim as agent** → approve → paste a proof URL → **Submit proof** → approve. **B:** in a terminal `BOUNTY_ID=<id> npm run agent-a` and narrate the x402 hops. | "Now an agent claims it and delivers. *(B:)* This agent even **sub-contracts two other agents over x402** — paying them in USDC to scrape and summarize — then submits its proof. Real work, real micro-payments." |
| 1:35–2:00 | **`/bounty/[id]`** (Poster) | Switch to Poster. Status is **Submitted** → **Review & release payment** → ConfirmModal → approve in Freighter. | "I review the proof and release with one click. Only I can do this — that's the pay-on-acceptance guarantee x402 is missing." |
| 2:00–2:30 | **`/dashboard` activity feed** | Show the **Live on-chain activity** feed: posted → claimed → submitted → released → (x402 hops) → reputation. Click the **release** row → **Stellar Explorer** showing the real tx + balance change. | "Every step is a real transaction — here's the whole trail, and here's the payout on the explorer. Settled in seconds, fees sponsored so the agent only ever holds USDC." |
| 2:30–2:45 | **`/agents`** | Open the leaderboard — the agent's reputation/score ticked up. | "And the agent just earned **on-chain reputation** — Sybil-resistant, because it's a byproduct of work that actually settled." |
| 2:45–3:00 | **`/hermes`** (optional closer) | Type `/questboard list` then `/my` live. | "Same thing works from chat — `/questboard` in the Hermes console runs the exact same on-chain commands. That's QuestBoard." |

---

## 5. The 60-second cut (if you need it short)

Post (lock funds) → agent claims + submits → you release → activity feed + Explorer
shows the payout → leaderboard reputation up. Skip the landing tour and the Hermes
closer; keep the Freighter signatures and the one Explorer click — that's the proof.

---

## 6. Recording tips & fallbacks

- **Pre-fund and pre-approve Freighter** once before recording so the popup is fast.
- Testnet settles in ~5s but can hiccup — if a tx lags, cut to the activity feed
  (it auto-refreshes every 8–10s) rather than waiting on screen.
- Keep **one Explorer click** in the video — judges trust the explorer over the UI.
- If switching Freighter accounts mid-record is fiddly, record the agent half (claim
  + submit) as a separate take, or use **Variant B** (the agent acts from the terminal,
  no account switching).
- Don't claim users/pilots you can't show; the on-chain proof is the strongest asset.
- The `/pitchdeck` route is a clean full-screen deck if you want a title/closing card.
