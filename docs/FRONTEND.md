# QuestBoard — Front-end redesign (`dex/front-end`)

A full visual + UX overhaul of the QuestBoard web app, plus a couple of supporting tools. The goal:
turn the functional MVP into a **cozy-mystic voxel** product that sells the vision, **without touching
the on-chain / wallet / data layer**. Everything below is presentation + a small seed script.

> **Functional-first guarantee:** the wallet, contract clients, bindings and data flow are unchanged.
> Post / claim / submit / release / refund all work exactly as before. Verified end-to-end (see
> _Verification_). This branch was merged up to `origin/main`, so it also contains the pitch-deck
> base, the x402 retry fix and the QA work from PR #29.

---

## 1. Art direction — "cozy-mystic voxel"

A Minecraft-style voxel forest world at night: the **QuestBoard** (an in-world wooden bounty board)
and **cube-headed crab/robot agents** with glowing eyes. Concept art was directed in ChatGPT
(gpt-image); the hero video was generated with **fal.ai Kling 2.1** (image-to-video). The build
turns that art into the real, working product.

**Palette (Tailwind tokens, added — defaults never clobbered):**

| Token | Use | Hex |
|---|---|---|
| `ink` (+ 950–600) | navy night canvas / surfaces | `#0A0E1A` … |
| `glow` (+ soft/deep) | cyan — quest / on-chain | `#22D3EE` |
| `gold` (+ soft/deep) | amber — reward / lantern / primary CTA | `#F5A623` |
| `bloom` (+ soft/deep) | magenta — mystic / cherry-blossom accent | `#E26FD0` |

Fonts: **Sora** (display) + **JetBrains Mono** (mono) via `next/font`. Signature ease
`cubic-bezier(0.16,1,0.3,1)`. Helpers in `globals.css`: `.glass`, `.text-gradient`, `.bg-stars`,
`animate-fade-up`. The app is forced into dark mode (`<html class="dark">`) so existing `dark:`
variants light up everywhere.

---

## 2. Dependencies added

`framer-motion`, `gsap`, `lenis`, `class-variance-authority`, `clsx`, `tailwind-merge`.
(`three`/R3F were planned for a later interactive-hero phase; not used yet.)

---

## 3. Design-system foundation

- `app/lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `app/tailwind.config.ts` — palette above + `fontFamily` (display/mono), `boxShadow`
  (`glow`, `glow-gold`, `card`), keyframes/animations (`fade-up`, `float`, `glow-pulse`), eases.
- `app/app/globals.css` — glass / gradient-text / starfield helpers, reduced-motion guard.
- `app/app/layout.tsx` — fonts, forced dark theme, `ink` canvas.

---

## 4. Landing (`app/app/page.tsx`)

- **`PicassoHero`** (`app/components/PicassoHero.tsx`) — split, product-grade hero: left-aligned
  headline ("Agents do the work. You pay if it passes."), CTAs, "powered by" row; the **voxel world
  video** weighted right; a **live on-chain stats strip** (active bounties / locked in escrow /
  agents earning). **Framer Motion** entrance + **GSAP** mouse-parallax on the world. Mobile: lower
  scrim + smaller headline. Hydration-safe (no `useScroll`).
- **`LandingLive`** — "Live on the board": a grid of real bounties rendered as `QuestCard`s.
- "How it works" + "Hermes" sections restyled to glass.

---

## 5. Quest cards + on-chain category encoding

The contract has no "category/icon" field, so we **persist the poster's icon choice in the bounty
`description`** as a trailing marker `[qb:<key>]` — real, on-chain, no off-chain DB.

- `app/lib/quests.ts` — 6 categories (`development, security, docs, design, qa, content`) each with
  label/color/emoji/image/keywords. `encodeIcon()`, `stripMarker()`, `parseQuest()` (marker →
  fallback keyword match → default), `rarityOf(amount)` (Common/Uncommon/Rare/Epic from the **real**
  escrow amount), `daysLeft(deadline)`.
- `app/components/QuestCard.tsx` — ornate card: voxel icon (`QuestIcon`, with emoji fallback),
  category, **real reward** (`formatAmount`), rarity pips, days-left, status. Reused on landing,
  `/board`, dashboard and (large icon) the bounty detail.
- The marker is stripped everywhere the description is shown.
- Icons: `app/public/quests/<key>.png` (6 voxel renders, fal.ai).

---

## 6. Browse the board (`app/app/board/page.tsx`)

New `/board` route: a voxel banner header + a responsive grid of `QuestCard`s for active bounties
(Open/Claimed/Submitted) with pagination. The hero CTA "Browse the board" points here.

---

## 7. Hermes interactive console

- `app/components/HermesConsole.tsx` — a terminal on `/hermes` that runs the **real**
  `/questboard list · post · claim · submit · release`, `/agents`, `/my` commands against the
  contracts (reads instant; writes sign in Freighter), with command history (↑/↓) and `/help`,
  `/clear`. Reuses `bountyClient` / `registryClient` — no new logic.
- `app/app/hermes/page.tsx` — "Try it live" console + the command reference, restyled.

---

## 8. App surfaces restyled (glass / dark)

Presentation-only restyle (logic untouched): `dashboard` (art banner, Post vs Earn cards, "My posted
bounties", "Explore & earn", live activity — all `QuestCard` grids; compact aggregate amounts),
`post` (glass form + **category icon picker** → `encodeIcon`), `bounty/[id]` (glass, large
`QuestIcon`, marker stripped, actions intact), `agents` + `agents/[address]` + `agents/register`,
`connect`. Components: `SiteHeader` (dark glass + **mobile hamburger menu**, hidden on `/pitchdeck`),
`ActivityFeed`, `BountyBoard` (leaderboard), `ConfirmModal`, `X402Explainer`.

`app/lib/labels.ts` — added `formatAmountCompact()` (k/M for aggregate stats; individual rewards stay
exact).

---

## 9. Pitch deck (`app/app/pitchdeck/PitchDeck.tsx`)

Full rebuild into an **immersive, motion-first** 9-slide deck (full-bleed art + scrims + overlaid
text, Framer crossfade + `fade-up`, keyboard / click / dots nav, full-screen — no site chrome):

1. Cover (voxel world video) · 2. Problem · 3. Solution (glass pillars) · 4. How it works (real
`QuestCard`) · 5. The product (3 real `QuestCard`s) · 6. Hermes · 7. x402 multi-hop · 8. Tech ·
9. Close ("QuestBoard" wordmark). Art in `app/public/pitch/`.

---

## 10. Seed tooling + on-chain demo data

- `agent/x402-demo/src/bounty.ts` — added `createBounty()` (headless, signs with a keypair).
- `agent/x402-demo/src/seed.ts` — posts **6 bounties, one per category** (deadline 7 days, varied
  amounts spanning rarities) so the board/dashboard look full. Run with `tsx src/seed.ts`
  (`POSTER_SECRET` from `.env.local`). Already seeded on testnet (bounties #11–#16).

---

## 11. Responsive

Mobile audit + fixes: header **hamburger menu** (the nav was hidden on mobile before), hero sizing +
legibility scrim, no-wrap compact amounts, pitch-deck title sizing. All grids collapse to one column;
forms/rows stack. (Note: verified at the breakpoint level — do a final visual pass in Chrome
device-mode.)

---

## 12. Assets (`app/public/`)

`hero.mp4` (Kling hero video), `hero-world.png`, `hero-board.png`, `dashboard-banner.png`,
`favicon.ico` (voxel cube → `app/app/favicon.ico`), `quests/*.png` (6 category icons),
`pitch/*.png` (cover, cover-wide, world, agent, hermes, emblem, cards, slide2/7/8/9).

---

## 13. Verification

- `next build` ✓ (12/12 routes, lint + types pass) · `tsc --noEmit` ✓ · `vitest` ✓ **41/41**
  (incl. new `quests.test.ts`: encode/parse/rarity round-trips).
- In-browser walkthrough of every route: live on-chain data loads, post/claim/release intact,
  **0 console errors**.
- Did **not** touch: `app/lib/WalletContext`, `ToastContext`, `bountyClient`/`registryClient`/
  `contractClients`, `bindings/*`, or the Soroban contracts.

---

## 14. How to run

```bash
cd app && npm install && npm run dev    # http://localhost:3000
# optional: seed demo bounties
cd agent/x402-demo && npm run seed       # needs POSTER_SECRET in .env.local
```
