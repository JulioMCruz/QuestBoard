# QuestBoard — Second-Pass UX Review
**Date:** June 2026  
**Reviewer:** UX Design (second pass — implementation grounded)  
**Source read:** every page, component, and lib file in `/app/`  

---

## What is actually built vs. what UX.md specified

The first design pass was well-executed. What landed:

| Area | Designed | Implemented | Gap |
|---|---|---|---|
| Landing page | Yes | Yes (`page.tsx`) | Landing stats section is silent when board is empty — no message |
| `/connect` wallet page | Yes | Yes | Extension-detected check is `null` until async completes — flash of "Connect" button before extension check resolves |
| Dashboard (role-aware) | Yes — full spec | Yes (`dashboard/page.tsx`) | Implemented but missing key affordances (see §1) |
| Post bounty | Yes | Yes | Deadline is still a raw number input, not preset buttons |
| Bounty detail | Yes | Yes | Missing per-status Stellar Explorer tx link; proof display is raw text only |
| Agent profile | Yes | Yes | Score and Earned duplicate the same number (score = base units, formatted as XLM — see §1.3) |
| Leaderboard | Yes | Yes | No empty state copy, no rank medals |
| Agent register | Yes | Yes | Endpoint URL field is optional but the help text implies it is required for x402 |
| Hermes page | Yes | Yes | Warning emoji `⚠️` at bottom is the only testnet notice on the page — easy to miss |
| Status language / labels | Yes | Yes — `labels.ts` | Implemented; BountyCard still shows raw `bounty.status` ("Claimed") instead of `statusLabel()` |
| ConfirmModal | Yes | Yes | Does not announce to screen readers (`aria-live` missing) |
| X402Explainer | Yes | Yes | Appears on bounty detail AND agent profile — correct per spec |
| Transaction states | Yes | Partial | Submit handlers show "Submitting to Stellar — this takes a few seconds…" inline text, but no progress bar, no success toast |
| Error mapping | Yes | Yes — `humanError()` | Does not map "insufficient allowance" (SAC approval) or "simulation error" |
| Stellar Explorer link | Yes | Partial | Bounty detail links to the **factory contract**, not the individual transaction |

---

## 1. The five biggest UX/trust gaps

### Gap 1 — The cold-start emptiness is fatal (priority: critical for demo)

`LandingLive.tsx` and `BountyBoard.tsx` both exist. But when the board is empty — which it is for every new visitor and every fresh testnet deploy — the user sees:

- Landing stats: `0 Active bounties · 0 XLM Locked in escrow · 0 Agents earning`  
- Recent bounties section: silently absent (the `recent.length > 0 &&` guard hides the whole block)  
- Dashboard board: `"No bounties yet. Be the first to post one."` — one plain gray line

Three zeroes and an empty table is the opposite of social proof. A person evaluating QuestBoard for the first time sees a ghost town and has no reason to believe it works. This is compounded by the "Agents earning" stat being `0` at testnet launch.

**What to build:** Seed the testnet with 3–5 demo bounties before any presentation or public link goes live. The empty-state copy also needs a deliberate design — not just a fallback `<p>`. When the board is empty, show a card: "QuestBoard is live on Stellar Testnet. Post the first bounty to see agents compete." with the "Post a Bounty" CTA inline. The hidden recent-bounties section should show a skeleton/placeholder when loading and a distinct message when empty, not nothing.

---

### Gap 2 — The BountyCard uses raw status strings instead of `statusLabel()` (priority: high, low effort)

`BountyCard` in `BountyBoard.tsx` renders:

```tsx
<span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
  {bounty.status}
</span>
```

This shows "Claimed", "Submitted", etc. — the contract enum values — not the human labels from `labels.ts`. The role-aware labels implemented in `dashboard/page.tsx` and `bounty/[id]/page.tsx` don't reach the public-facing board cards. A visitor to the board (not connected) sees raw contract state strings. Every card on the board should call `statusLabel(bounty.status, "public")` to show "Open", "In progress", "Under review", "Completed", "Closed".

---

### Gap 3 — No transaction success feedback anywhere (priority: high)

After a successful `createBounty`, `claimBounty`, `submitProof`, or `releasePayment`, the app redirects or re-fetches silently. There is:
- No success toast
- No "Bounty #42 posted — share the link" message
- No confirmation of what just happened on-chain
- No tx hash shown anywhere post-transaction

The user signed something in Freighter, the screen changed, and they have no proof anything happened. This is the highest-anxiety moment in the entire flow. The `signAndSend()` call in `bountyClient.ts` returns a result object that contains the transaction hash. That hash should be surfaced every time with a link to `stellar.expert/explorer/testnet/tx/<hash>`. A simple toast component at the root layout level would handle all cases.

---

### Gap 4 — The agent profile has a stat bug that undermines trust (priority: medium)

`agents/[address]/page.tsx` shows three stats: Reputation, Bounties done, Earned. The "Reputation" value is `agent.score` (a raw base-unit integer from the chain). The "Earned" value is `formatAmount(agent.score)` — which converts the same `score` field from base units to XLM/USDC. So Reputation shows "50000000" and Earned shows "5 XLM" — or if score is small, Reputation shows "5" and Earned shows "0.00 XLM". Neither is right.

The score field from `AgentRegistry` is an accumulated `i128` that equals the total USDC/XLM paid. It is not a separate dimensionless reputation score. Showing it raw as "Reputation" is misleading. The design intent was a reputation score that could scale independently from earnings. Until the contract adds a separate reputation field, show only one stat: "Total earned" using `formatAmount(agent.score)`. Drop the raw Reputation stat or note it equals earnings.

---

### Gap 5 — No way to know your money moved without going to Stellar Explorer yourself (priority: high)

When a poster releases payment (`releasePayment`), the flow is:
1. Poster clicks "Review & release payment"
2. ConfirmModal shows — good
3. Poster approves in Freighter
4. `run()` calls `mutate()` to refresh bounty state
5. Bounty status changes to "Released" — silently

There is no:
- Toast: "5 XLM sent to GABC…1234"
- Tx hash link to Stellar Explorer
- Timestamp of the completed payment
- Reputation bump notification ("Agent's score increased")

The `escrowLine` function already handles the "Released" state copy ("5 XLM sent to the agent") but it only shows if the **poster** is viewing after the fact, and even then there's no date. The confirmation moment — which is the single biggest emotional payoff in the product — is completely silent.

---

## 2. Core experience problem: who is this app really for?

**The honest answer:** QuestBoard is primarily an **agent operator and developer experience** with a human-posting shell bolted on top.

Here is why: the humans who post bounties (LATAM founders, per the README) need an agent to actually claim and do work before they can see any value. There is currently no agent that auto-claims new bounties. There is no push notification when a claim happens. There is no SLA or guarantee that any agent will pick up the work within the deadline. A human posts, waits, and has no idea whether the bots are running.

The web app serves humans fine for posting and releasing. But the **autonomous agent path** — claim, sub-contract via x402, submit proof — is entirely outside the web app. An agent operator runs `npm run register`, starts Agent A/B/C processes, and monitors via CLI or Hermes. The web app never shows that work happening.

**Point of view:** For the hackathon, lean into this split explicitly rather than fighting it. The web app is the **poster dashboard and proof-review interface**. Make it excellent for that one persona. The agent experience belongs in the CLI and Hermes — present it as a deliberate design choice, not a gap. The demo script should show both surfaces side by side, not pretend the web app handles everything.

For real-world adoption after the hackathon, the gap that matters most is **making agent activity visible to human posters**. A poster needs to see "Agent A claimed your bounty at 14:23 and is working" — without that, they feel abandoned. This is the one place the two audiences need to connect inside the web app.

---

## 3. First-run / cold-start UX

### What a brand-new visitor actually experiences today

1. Lands on `/` — sees hero, "Post a bounty" / "Browse Bounties" CTAs, "How it works" steps, Hermes section
2. Stats section shows `0 / 0 / 0` if board is empty — kills credibility
3. Clicks "Browse Bounties" — goes to `/dashboard` — sees `"No bounties yet. Be the first to post one."`
4. Clicks "Post a Bounty" — goes to `/post` — if not connected, sees a small yellow banner asking them to connect
5. Clicks Connect — Freighter popup fires directly from the nav button (no `/connect` intermediary for the landing → post path)
6. If Freighter not installed: raw error message from `humanError()` appears inline: "Freighter isn't installed. Install it from freighter.app, then try again." — no visual install card, no guided path

The "Browse Bounties" button on the landing page links to `/dashboard` (the role-aware shell), not `/dashboard` as a board. There is no standalone `/board` route. So "Browse Bounties" shows a dashboard with "Post a bounty / Earn as an agent" cards to an unconnected visitor — which is confusing. The visitor wanted to browse.

### What should happen instead

**No-wallet path:** The landing page "Browse Bounties" should go to a pure read-only board view where an unconnected visitor can see live bounties, click into bounty detail pages, and get a feel for the marketplace — all without Freighter. The dashboard shell (with its wallet-gated panels) is the wrong destination for a curious newcomer.

**No-install path:** There needs to be a demo mode or seeded data path. The most pragmatic solution for the hackathon: pre-seed the testnet with 5 realistic bounties representing different task types (research, translation, summarization, scraping, code review), pre-register 3 demo agents with scores, and keep them alive. This is a `./scripts/seed.sh` — not a UX component, but it has higher UX impact than any UI change.

**One-click try path:** Consider adding a "Try the demo" CTA on the landing that auto-navigates to a pre-seeded bounty's detail page, showing a bounty already in "Submitted" state with proof filled in. This lets a visitor see the release-payment action and understand the thesis in 20 seconds without installing anything.

**Connection flow gap:** The `/connect` page is implemented and well-designed, but it's only reachable from the nav. The landing CTAs and the post page connect inline via `WalletButton`. This means the carefully-designed `/connect` trust explanation (the "what QuestBoard can and cannot do" checklist) is bypassed for users who click the nav "Connect Wallet" button directly. The `/connect` page should be the canonical path, reached from any connect action.

---

## 4. The demo moment — 90-second live flow

### Proposed script (designed for a projector, ~90 seconds)

**Pre-conditions:** Testnet seeded. Two browser windows open: Window A = the web app, Window B = a terminal running `agent-a` with logs visible. Two Freighter wallets configured: Poster (GPOST…) and Agent A (GAGENT…).

**Screen 1 (0:00–0:15) — Landing page, Poster wallet**  
Show the live stats section with real numbers. Point to "3 Active bounties, 8 XLM locked in escrow." Say: "Human posters lock funds here. Agents compete for them."  
Navigate to Dashboard → show one existing Open bounty.

**Screen 2 (0:15–0:35) — Post page**  
Click "Post a Bounty." Fill title: "Summarize Stellar Q2 2026 governance proposals." Amount: 2 XLM. Deadline: 24h. Click "Post & Lock Funds."  
Freighter popup appears — presenter approves.  
**Missing feedback that needs to exist for this moment:** After submission, a success toast: "Bounty #7 posted — 2 XLM locked. Waiting for an agent." with a Stellar Explorer tx link. Currently this moment is silent.

**Screen 3 (0:35–0:50) — Agent terminal (switch to Window B)**  
The `agent-a` process picks up the new bounty from the contract, logs: "Claimed bounty #7." Show the terminal. Switch back to the web app. Refresh the dashboard. Bounty status changed from "Waiting for an agent" to "Agent is working."  
**Missing feedback:** No in-app notification of the claim event. The poster had to manually refresh. This is the core async gap that matters for real users — a simple SWR `refreshInterval: 10000` on the dashboard would auto-poll.

**Screen 4 (0:50–1:10) — x402 multi-hop (the thesis)**  
Still in the terminal. Show Agent A's logs as it calls Agent B (scraper) and Agent C (summarizer) via x402. Point to the cost lines: "Agent A paid Agent B $0.05 for scraping. Agent C $0.03 for summarizing."  
**Missing feedback on the web app side:** Nothing. The x402 sub-payments are invisible to the poster. For the demo, add a "Payment trail" section to the bounty detail that shows sub-payments as they happen — even as static demo data if the live feed isn't ready. Show: "Agent A → Agent B: 0.05 XLM (scraping) · Agent A → Agent C: 0.03 XLM (summarizing)" This is the moment that makes the x402 thesis tangible.

**Screen 5 (1:10–1:30) — Proof submitted, release payment**  
Back to web app. Bounty status has moved to "Ready to review." Proof hash is visible. Click "Review & release payment." ConfirmModal shows — approve. Freighter signs.  
**Missing feedback:** After release, show a toast: "2 XLM sent to GAGENT…4567. Agent's score updated on Stellar." Then navigate to the agent profile and show the score/earnings bumped.

**Total missing for a clean demo:**
1. Post-success toast with tx hash and Explorer link
2. Auto-poll on dashboard (10s interval via SWR `refreshInterval`)
3. Payment trail section on bounty detail (can be hardcoded for demo)
4. Post-release toast with agent address and score bump message

---

## 5. Presentation-grade polish gaps

### 5.1 The status badge on BountyCard is raw contract state (confirmed in code)

`BountyBoard.tsx` line 62: `{bounty.status}` — no `statusLabel()` call. Every card on the public board says "Claimed", "Submitted" etc. Fix: change to `statusLabel(bounty.status, "public")`.

### 5.2 The landing page stat section is silent while loading

`LandingLive.tsx` shows `useSWR` data but the Stat components render `0` and `0 XLM` while the request is in flight, since both default to `0`. This means a user on a slow connection sees zeros for 1–2 seconds before real numbers appear. It looks like an empty marketplace. Fix: render a shimmer/skeleton for the three stat boxes during the loading state rather than showing zeros.

### 5.3 No toast system exists

There is no global toast/notification component anywhere in the codebase. All feedback is inline text inside the form/action area. After a transaction, the only signal is the inline `<p className="text-sm text-gray-500">Submitting to Stellar…</p>` which disappears when the `submitting` state clears. Users have no persistent confirmation. A single toast hook (even a custom one with a 4-second auto-dismiss) at the layout level would fix this for all actions.

### 5.4 Deadline field is a raw number input

`post/page.tsx` shows `type="number" min="1"` for the deadline in hours. The UX.md spec called for preset buttons (12h / 24h / 48h / Custom). This still hasn't been implemented. Raw hour entry is confusing — users don't think in hours, they think in "tomorrow" or "one week." The preset buttons are a 20-minute frontend change with significant clarity gain.

### 5.5 The `⚠️ Testnet demo` note on Hermes page uses an emoji

`hermes/page.tsx` line 59 has `⚠️ Testnet demo. Keep your wallet on Testnet while trying QuestBoard.` — this is the only testnet warning on the entire Hermes page, and it's rendered as a bare `<p>` with an emoji at the bottom of a long page. The TESTNET badge in the nav (amber, conditional on network) is the right pattern — reuse it on the Hermes page as a proper badge component, not a footnote emoji.

### 5.6 Agent profile stats are duplicated/misleading

As noted in Gap 4: `agents/[address]/page.tsx` shows Reputation = `agent.score` (raw base units or a meaningless integer) and Earned = `formatAmount(agent.score)` (the same number formatted). These are the same field shown twice. Until there's a distinct reputation score in the contract, collapse to two stats: "Total earned" and "Bounties completed."

### 5.7 No back-navigation breadcrumb on mobile

The `← Back to dashboard` / `← Back to agents` links are present but they are small text links. On mobile, these are the only exit from a detail page — there's no bottom navigation, no back affordance other than the browser back button. This is fine for desktop demo but breaks mobile. Not a hackathon blocker but worth noting for the "real users" brief.

### 5.8 WalletButton disconnects without confirmation

`SiteHeader.tsx` has a "Disconnect" button that calls `disconnect()` directly — no modal, no warning. For a testnet product this is fine, but a presenter could accidentally click disconnect mid-demo. Consider swapping to a small dropdown from the address pill (Dashboard / View profile / Disconnect) as specified in UX.md §7 — it prevents fat-finger disconnects and exposes the profile link.

---

## 6. Trust and legibility

### 6.1 The Stellar Explorer link points to the contract, not the transaction

`bounty/[id]/page.tsx` line 186–196 shows:
```
https://stellar.expert/explorer/testnet/contract/${FACTORY_ID}
```
This links to the factory contract page — which shows all transactions to that contract, not the specific one for this bounty. After a user releases payment, they want to see **that specific transaction**. The tx hash from `signAndSend()` should be stored in local state after each action and linked directly: `https://stellar.expert/explorer/testnet/tx/<txHash>`. This is the difference between "view the whole factory" (audit) and "view your transaction" (receipt).

### 6.2 Proof display is raw text — no auto-link for IPFS

`bounty/[id]/page.tsx` shows `bounty.submissionProof` as plain text with `break-all`. The UX.md open question #5 asked about this. An IPFS CID (`Qm...` or `ipfs://`) should be auto-linked. A simple regex check on `Qm` prefix or `ipfs://` prefix that wraps the text in an `<a href="https://ipfs.io/ipfs/...">` would significantly improve the review experience — a poster can actually click to view the delivered work rather than copy-pasting a CID into a separate tool.

### 6.3 Refund is always visible, even during active claims

`bounty/[id]/page.tsx` shows the "Get my funds back" button to the poster for any non-finalized bounty — including Claimed and Submitted states. A poster can refund a bounty that an agent is actively working on. This is a trust and fairness problem. The UX.md open question #4 flagged this. For the demo, visually demote the refund button when status is Claimed or Submitted: use a text link with a warning tooltip ("Refunding while an agent is working on this will cancel their work") rather than a prominent button. The contract-level enforcement is separate — this is purely a UI guardrail.

### 6.4 No indication that the escrow amount is USDC vs. XLM

The `TOKEN_LABEL` env var defaults to `XLM` but the README says the demo uses USDC on testnet. Every amount label in the UI says `XLM`. The `LandingLive.tsx` stat says "Locked in escrow: 0 XLM." A presenter pitching a USDC-escrow marketplace who shows "XLM" throughout will confuse judges. Confirm the env var is set to `USDC` before the demo, or hard-code for the demo deployment. The trust implication: "is this XLM or USDC?" is a question that should never occur to a viewer.

### 6.5 No date/timestamp on completed bounties

Released and Refunded bounties show no completion date. "5 XLM sent to the agent" with no timestamp feels unverified. Add `createdAt` and a "completed at" timestamp (derivable from the contract's ledger timestamp on the release tx, or stored as a field). Even "Released on June 24, 2026" adds credibility.

---

## 7. Prioritized improvement list

### Tier 1 — Required for a clean demo (hours of effort)

| # | Change | File(s) | Effort |
|---|---|---|---|
| D1 | Seed testnet with 5 demo bounties + 3 agents | `scripts/seed.sh` (new) | 1–2h |
| D2 | Fix BountyCard to use `statusLabel(b.status, "public")` | `components/BountyBoard.tsx` line 62 | 5 min |
| D3 | Add SWR `refreshInterval: 10000` to dashboard bounty fetch | `app/dashboard/page.tsx` line 13 | 5 min |
| D4 | Add a toast component + fire it on every successful transaction | New `components/Toast.tsx` + layout | 2–3h |
| D5 | Show tx hash + Stellar Explorer link after each action | `lib/bountyClient.ts` returns hash; surface in toast | 30 min |
| D6 | Fix stat skeletons during loading (don't show `0 / 0 / 0`) | `components/LandingLive.tsx` | 30 min |
| D7 | Fix agent profile duplicate stat (Reputation vs Earned) | `app/agents/[address]/page.tsx` | 10 min |
| D8 | Set `NEXT_PUBLIC_TOKEN_LABEL=USDC` in demo `.env.local` | Config only | 2 min |

### Tier 2 — Significantly improves real-user credibility (days of effort)

| # | Change | File(s) | Effort |
|---|---|---|---|
| U1 | Deadline preset buttons (12h / 24h / 48h / Custom) | `app/post/page.tsx` | 1h |
| U2 | IPFS/URL auto-link in proof display | `app/bounty/[id]/page.tsx` | 30 min |
| U3 | Explorer link goes to specific tx, not the factory contract | `app/bounty/[id]/page.tsx` + `bountyClient.ts` | 1h |
| U4 | Demote refund button when status is Claimed/Submitted | `app/bounty/[id]/page.tsx` | 30 min |
| U5 | Add `aria-live` to ConfirmModal and status messages | `components/ConfirmModal.tsx` | 20 min |
| U6 | Empty-state copy improvement on board (not just "No bounties yet") | `components/BountyBoard.tsx` | 20 min |
| U7 | Connect button routes through `/connect` page for the trust explanation | Nav + landing CTAs | 1h |
| U8 | Add address copy-to-clipboard on wallet pill and Field components | `SiteHeader.tsx`, `bounty/[id]` | 1h |
| U9 | Completion timestamp on Released/Refunded bounties | `lib/types.ts` + display | 1–2h |

### Tier 3 — Needed for real adoption beyond the hackathon

| # | Change | Notes |
|---|---|---|
| A1 | Push/poll notifications when bounty status changes | Browser push or server-sent events; currently requires manual refresh |
| A2 | Payment trail section on bounty detail (x402 sub-payments visible) | Requires indexer or agent webhook; the most important differentiation feature |
| A3 | "Try it — no wallet needed" demo mode with read-only pre-seeded data | Browser-local demo state; significant but high conversion value |
| A4 | Mobile nav (hamburger for Board/Agents/Hermes; wallet pill always visible) | Needed for any non-desktop usage |
| A5 | Leaderboard rank medals (1st, 2nd, 3rd visual differentiation) | Polish; easy; makes the competitive dynamic visible |
| A6 | "Completed bounties" list on agent profile page | Requires filtering `listBounties` by agent address — data already available |
| A7 | Separate reputation score from earnings in `AgentRegistry` contract | Contract-level; needed for the reputation system to be meaningful |
| A8 | Proof requirement field on bounty post form | Acceptance criteria for the agent; reduces disputes |

---

## Summary of the single most important insight

The product's central narrative — AI agent claims a task, sub-contracts two more agents via x402, all settle on Stellar, reputation bumps — is technically complete and verifiable on testnet. The UX gap is that **none of that narrative is visible to a human watching the web app**. The agent does its work off-screen. The x402 hops are invisible. The reputation update is silent. The payment confirmation is a status change with no timestamp or receipt.

The highest-leverage demo fix is not a new screen or a redesign. It is: **make the invisible visible**. Toast when a bounty is claimed by an agent. Show the x402 payment trail on the bounty detail (even if hardcoded for the demo). Surface the tx hash after every action. Show the agent's score tick up on the profile page after payment releases. These changes take a working product and make it a convincing one.
