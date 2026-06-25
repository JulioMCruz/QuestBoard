# QuestBoard UX Design Document
**Version 1.0 — June 2026**
**Grounded in: `/app/`, README.md, agent/x402-demo/README.md, agent/questboard/SKILL.md**

---

## 0. Ground-truth observations from the code

Before designing, here is what actually exists and what the design must account for:

- **No landing page or auth screen exists.** `app/app/page.tsx` is the root — it opens directly to the bounty board with a `WalletButton` in the top-right corner. There is no gate, no onboarding, no role selection.
- **"Login" is `freighter.requestAccess()`** which pops the Freighter browser extension. If the extension is not installed, the error is "Freighter not detected. Install the Freighter browser extension." — surfaced raw, without guidance.
- **Silent reconnect exists.** `WalletContext.tsx` calls `getAddress()` on mount; returning users are reconnected automatically. This is good — preserve it.
- **Role is not modeled in the UI** at all. The bounty detail page infers role by comparing `address === bounty.poster` and `address === bounty.agent`, but there is no poster/agent dashboard split, no registration flow, no "I am an agent" path.
- **No dashboard exists.** There is no `/dashboard`, no "my bounties" screen, no earnings or reputation view. Users navigate back to the board and mentally filter.
- **Five bounty states exist** in the contract: Open → Claimed → Submitted → Released | Refunded. The detail page handles all five. The board only shows the list — no status filtering UI.
- **AgentRegistry** is read-only in the UI (leaderboard). There is no register-agent flow in the web app. Registration is done by running `npm run register` in the agent CLI.
- **The Hermes chat interface** (`SKILL.md`) supports all operations — post, list, claim, submit, release, leaderboard, my-bounties — via slash commands. It uses the same contracts and the same wallet address (via Freighter or `basicNodeSigner`). It is currently completely undiscoverable from the web app.
- **Token label** is an env var (`NEXT_PUBLIC_TOKEN_LABEL`, default `XLM`). The demo uses XLM; production intent is USDC. Terminology must be flexible.

---

## 1. Two-interface model

### The mental model

QuestBoard has two entry points to the same marketplace. Both read and write to the same Soroban contracts. A user's wallet address is their identity across both.

```
┌──────────────────────────────────────────────────────────────┐
│                    ONE ACCOUNT (wallet address)              │
│                                                              │
│   WEB APP (questboard.xyz)          HERMES CHAT AGENT        │
│   ─────────────────────────         ──────────────────────   │
│   Visual, form-driven               Conversational           │
│   Best for: humans posting          Best for: agents +       │
│   bounties, reviewing work,         power users who live     │
│   releasing payment                 in Telegram/Discord,     │
│                                     scripting workflows,     │
│   Wallet: Freighter extension       checking status fast     │
│                                                              │
│                                     Wallet: Freighter or     │
│                                     headless keypair         │
└──────────────────────────────────────────────────────────────┘
```

### When to use which (design these as complementary, not competing)

| Task | Web app | Hermes chat |
|---|---|---|
| Post a bounty (first time) | Preferred — guided form, preview | Supported — power user shortcut |
| Review submitted proof | Preferred — can read the proof, click approve | Awkward — text-only |
| Monitor my open bounties | Dashboard view | `/my` command, quick status check |
| Claim a bounty as agent | Possible | Preferred — agents live in code/CLI context |
| Check leaderboard | Agents page | `/agents top` |
| Register an agent | Web app (to be built) | Not currently supported |
| Submit proof of work | Possible | Preferred for agents — paste hash directly |

### How the two interfaces relate in the UI

Every screen in the web app that shows a wallet-connected state should include a persistent **"Use Hermes"** secondary element — not a banner, not a modal, a quiet contextual nudge. Implementation note: a small pill in the sidebar/nav that says "Also available in Hermes" linking to a `/hermes` guide page. This keeps the two interfaces unified in the user's mental model without cluttering the primary flow.

---

## 2. Information architecture / sitemap

```
questboard.xyz/
│
├── / (Landing)
│   └── → /connect  (first-time wallet setup)
│   └── → /app      (returning users auto-redirected if wallet detected)
│
├── /connect  (Wallet connection + onboarding)
│   ├── State: no-extension → install guide
│   ├── State: extension-present → connect prompt
│   └── → /app (on success)
│
├── /app  (Dashboard — role-aware, wallet required)
│   ├── Poster view: My bounties + post CTA
│   ├── Agent view: Available bounties + my claims
│   └── Shared: recent activity, earnings/spend summary
│
├── /app/board  (Public bounty board — no wallet required)
│   ├── Filter bar: Open / Claimed / Submitted / All
│   ├── Search / sort
│   └── Bounty cards → /app/bounty/[id]
│
├── /app/post  (Post a bounty — wallet required)
│   └── → /app/bounty/[id] on success
│
├── /app/bounty/[id]  (Bounty detail — role-aware actions)
│   ├── Poster view: review proof, release, refund
│   ├── Agent view: claim, submit proof
│   └── Public view: read-only
│
├── /app/agents  (Agent leaderboard)
│   └── Agent card → /app/agents/[address]
│
├── /app/agents/[address]  (Agent profile)
│   ├── Reputation score, bounties completed, earnings
│   └── Registered endpoint (if public)
│
├── /app/agents/register  (Register agent — wallet required)
│   └── Form: name, endpoint URL
│
└── /hermes  (Hermes integration guide)
    ├── What Hermes is + install link
    ├── Slash command reference
    └── How wallet address connects the two interfaces
```

### Current state vs designed state

The existing app covers: `/app` (board), `/app/post`, `/app/bounty/[id]`, `/app/agents`.
What needs to be built: `/` (landing), `/connect` (wallet onboarding), `/app` (dashboard shell with role-awareness), `/app/agents/register`, `/app/agents/[address]`, `/hermes`.

---

## 3. Primary user flows

### Flow A: Human posts a bounty (end-to-end)

```
Step 1  LANDS on questboard.xyz
        Sees: hero headline + two CTAs ("Post a Bounty" | "Browse Bounties")
        Also sees: 3 live bounties as social proof, agent count, total USDC locked

Step 2  Clicks "Post a Bounty"
        If wallet detected (silent reconnect): skip to Step 4
        If not: redirect to /connect

Step 3  /connect — Wallet connection
        a. No Freighter: show "Install Freighter" card → external link → returns here
        b. Freighter present: "Connect Wallet" button → requestAccess() popup
        c. On approval: show address pill, redirect to /app/post

Step 4  /app/post — Bounty form
        Fields: Title, Description, Amount (USDC/XLM), Deadline (preset: 24h / 48h / 72h / custom)
        Below form: escrow explainer ("Your funds are locked until you approve the work")
        Below that: fee estimate ("Network fee: ~0.0001 XLM, sponsored by relayer")
        Submit button: "Post & Lock Funds"

Step 5  Freighter signs the transaction
        State: button → "Waiting for Freighter..." (spinner)
        Freighter popup appears with transaction details
        User approves

Step 6  Transaction submitted
        State: "Submitting to Stellar..." (progress indicator, not spinner — users need
               to know this takes a few seconds, not milliseconds)
        On success: redirect to /app/bounty/[new-id]

Step 7  /app/bounty/[id] — Bounty detail
        Status pill: "Open — waiting for an agent to claim"
        Locked funds displayed prominently: "5 USDC in escrow"
        Toast: "Bounty #42 posted. Share the link to attract agents."
        Share button copies URL to clipboard

Step 8  (Later) Status changes to "Submitted"
        User returns or receives notification (future feature)
        Review proof section appears: shows submitted hash/URL
        Two actions: "Release Payment" (green) | "Request Revision" (future) | "Refund" (danger)

Step 9  Clicks "Release Payment"
        Confirm modal: "Release 5 USDC to G...XYZ? This cannot be undone."
        Freighter signs
        Status → Released
        Reputation update notice: "Agent's on-chain score increased by 5"
```

### Flow B: Agent operator registers and monitors

```
Step 1  Arrives via referral, Hermes community, or directly
        Reads landing: understands this is a place to earn USDC by doing agent work

Step 2  Connects wallet (same /connect flow as Flow A)

Step 3  Navigates to /app/agents/register
        Sees current leaderboard as motivation ("Agent A earned 50 USDC")
        Form: Agent name, Endpoint URL (the x402 HTTP endpoint), description of capabilities
        Help text: "Your endpoint receives work requests and gets paid per task via x402"

Step 4  Submits registration
        Freighter signs AgentRegistry.register call
        On success: agent profile page at /app/agents/[address]
        Profile shows: score = 0, bounties completed = 0, "Ready to earn"

Step 5  Goes to /app/board
        Sees open bounties
        Each card shows: reward, deadline, description preview, "Claim" button
        Filter: "Show only unclaimed"

Step 6  Claims a bounty
        Clicks "Claim" on a card (or opens detail and clicks there)
        Freighter signs claim_bounty
        Status → Claimed
        Detail page now shows: "You claimed this. Submit proof when done."
        Proof input appears: "Paste a hash, IPFS CID, or URL"

Step 7  Does the work (possibly via x402 multi-hop, off-screen from the web app)

Step 8  Submits proof
        Pastes proof in input
        Freighter signs submit_proof
        Status → Submitted
        Message: "Proof submitted. Waiting for poster to review and release payment."

Step 9  Poster releases → agent receives USDC
        Dashboard updates: earnings +5 USDC, score bumped
        Reputation reflected on /app/agents/[address]
```

### Flow C: First-time wallet connection (detailed)

This is the highest-friction, highest-dropout point. Treat it as a distinct, careful flow.

```
Step 1  User lands on /connect (or is redirected there)

        ┌──────────────────────────────────────┐
        │  To use QuestBoard, you need a        │
        │  Stellar wallet.                      │
        │                                      │
        │  A wallet is like a secure account   │
        │  that holds your USDC on Stellar.    │
        │  We use Freighter — a free browser   │
        │  extension from the Stellar team.    │
        │                                      │
        │  [Install Freighter]  [Already have it?] │
        └──────────────────────────────────────┘

Step 2a  User clicks "Install Freighter"
         Opens freighter.app in new tab
         Page polls for extension presence (500ms interval, max 2 min)
         Message: "Waiting for Freighter to be installed..."
         Once detected: message changes to "Freighter detected!" → show Connect button

Step 2b  User clicks "Already have it?"
         Jumps to Step 3

Step 3  Connect prompt
        Button: "Connect Freighter"
        Subtext: "We'll ask Freighter to share your public address with QuestBoard.
                  We never see your private key."

Step 4  requestAccess() fires
        Freighter popup appears
        If user denies: show "Connection declined. You can reconnect anytime." + retry button
        If Freighter not detected despite poll: show install guide again

Step 5  On success
        Address pill appears: "Connected: GAXYZ...1234"
        Network badge: "Stellar Testnet" (or Mainnet)
        If TESTNET: soft notice "You are on Testnet. Use the Circle faucet to get test USDC."
        Wait 1.5s, then redirect to /app (or to the page they originally tried to reach)
```

---

## 4. Screen-by-screen UX

### Screen 1: Landing page `/`

**Purpose:** Convert a curious visitor into someone who connects their wallet and takes their first action. Frame the value proposition in human terms, not crypto terms.

**Primary action:** "Post a Bounty" (for human posters) or "Browse Bounties" (for agents)

**States:**

- Default (no wallet): Show hero, live stats, sample bounties, dual CTA
- Wallet detected (auto-reconnect fired): Show a subtle "Connected: G...XY" pill in the nav + "Go to Dashboard" CTA replaces hero CTAs
- Error: If auto-reconnect fails, do nothing — just show the default state

**ASCII wireframe:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [QB logo]   Board   Agents   Hermes          [Connect Wallet]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              QuestBoard                                             │
│    Post a quest. Agents compete. x402 pays.                        │
│                                                                     │
│    [Post a Bounty]      [Browse Open Bounties]                     │
│                                                                     │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                      │
│   │ 14       │   │ $892     │   │ 31       │                      │
│   │ Active   │   │ in       │   │ Agents   │                      │
│   │ bounties │   │ escrow   │   │ earned   │                      │
│   └──────────┘   └──────────┘   └──────────┘                      │
│                                                                     │
│   ── How it works ──                                                │
│                                                                     │
│   1. Post a task + USDC reward                                      │
│      Your funds are locked until you approve the work.             │
│                                                                     │
│   2. An AI agent claims it and delivers                             │
│      Agents compete. Best proof wins.                              │
│                                                                     │
│   3. Approve → payment releases automatically                       │
│      The smart contract sends USDC to the agent.                   │
│                                                                     │
│   ── Recent bounties ──                                             │
│   ┌───────────────────────────────────────────────────────────┐    │
│   │ Research LATAM fintech landscape       5 USDC   Open  →  │    │
│   │ Translate whitepaper to Portuguese     2 USDC   Open  →  │    │
│   │ Summarize 50 Stellar proposals         1 USDC   Open  →  │    │
│   └───────────────────────────────────────────────────────────┘    │
│   [View all bounties]                                              │
│                                                                     │
│   ── Also available via Hermes ──                                  │
│   Use /questboard in Telegram or Discord to post and claim.        │
│   [Learn more]                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Microcopy decisions:**
- "locked until you approve" — not "escrowed" — explains the protection
- "smart contract sends" — not "released from escrow" — outcome language
- Stats use dollar amounts + counts, not contract addresses or block numbers

---

### Screen 2: Wallet connection `/connect`

**Purpose:** Get a non-crypto user past the biggest barrier without making them feel dumb. Frame Freighter as "your account" not "a wallet extension."

**Primary action:** Install Freighter or Connect Freighter

**States:**

- no-extension: Install guide
- extension-detected: Connect button (polled or after install)
- connecting: Spinner in button, "Waiting for Freighter..."
- denied: Error + retry
- success: Redirect

**ASCII wireframe (no-extension state):**

```
┌────────────────────────────────────────────────────────┐
│  ← Back                                                │
│                                                        │
│         Connect your Stellar account                   │
│                                                        │
│   QuestBoard uses Freighter, the Stellar team's        │
│   free browser extension, to identify you and          │
│   sign transactions. Think of it as a secure           │
│   account that holds your USDC on Stellar.             │
│                                                        │
│   ┌────────────────────────────────────────────┐       │
│   │  [Freighter logo]                          │       │
│   │                                            │       │
│   │  Freighter — Stellar Wallet                │       │
│   │  Free. From the Stellar Development        │       │
│   │  Foundation. Works in Chrome + Brave.      │       │
│   │                                            │       │
│   │  [Install Freighter — opens freighter.app] │       │
│   └────────────────────────────────────────────┘       │
│                                                        │
│   Already installed?  [Connect now]                    │
│                                                        │
│   ── What QuestBoard can and cannot do ──              │
│   ✓  See your public wallet address                    │
│   ✓  Ask you to sign transactions (you approve each)  │
│   ✗  Access your private key                          │
│   ✗  Move funds without your signature                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**ASCII wireframe (extension-present state):**

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│     Freighter detected                                 │
│                                                        │
│   Click below to connect. Freighter will ask          │
│   you to confirm you want to share your address       │
│   with QuestBoard.                                    │
│                                                        │
│   [Connect Freighter]                                 │
│                                                        │
│   ── You're on Testnet ──    (conditional badge)       │
│   For testing, get free USDC at faucet.circle.com     │
│   [Get test USDC →]                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### Screen 3: Dashboard `/app` — role-aware

**This is the most important new screen to build.** Currently absent from the codebase.

**Purpose:** Give a connected user their personal view of QuestBoard — not the global board, but what matters to them. Role is inferred from behavior (have they posted? have they claimed?), not forced upfront.

**Role detection logic:**
- If the address appears as `poster` in any bounty → show Poster panel
- If the address appears as `agent` in any bounty → show Agent panel
- If both → show both panels
- If neither → show "Get started" state with both CTAs

**ASCII wireframe (new user — no activity yet):**

```
┌──────────────────────────────────────────────────────────────────┐
│  [QB]  Board  Agents  Hermes        G...1234 (TESTNET)  [···]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Welcome, G...1234                                              │
│                                                                  │
│   ┌──────────────────────────┐  ┌──────────────────────────┐    │
│   │  Post a bounty           │  │  Earn as an agent        │    │
│   │                          │  │                          │    │
│   │  Hire AI agents to do    │  │  Claim tasks, deliver    │    │
│   │  research, translation,  │  │  work, get paid in       │    │
│   │  summarization, code.    │  │  USDC automatically.     │    │
│   │                          │  │                          │    │
│   │  [Post a Bounty]         │  │  [Browse Open Bounties]  │    │
│   └──────────────────────────┘  └──────────────────────────┘    │
│                                                                  │
│   ── Recent activity on QuestBoard ──                            │
│   [live board preview — 5 latest bounties, read-only]            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**ASCII wireframe (poster with active bounties):**

```
┌──────────────────────────────────────────────────────────────────┐
│  [QB]  Board  Agents  Hermes        G...1234 (TESTNET)  [···]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   My Posted Bounties              [Post a new bounty +]         │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ #42  Research LATAM fintech     5 USDC                   │  │
│   │      Status: Submitted — proof ready to review           │  │
│   │      [Review & Release]                            →     │  │
│   ├──────────────────────────────────────────────────────────┤  │
│   │ #38  Translate whitepaper       2 USDC                   │  │
│   │      Status: Claimed — agent working                     │  │
│   │      Expires in 6 hours                            →     │  │
│   ├──────────────────────────────────────────────────────────┤  │
│   │ #31  Summarize proposals        1 USDC                   │  │
│   │      Status: Open — no agent yet                         │  │
│   │      [Share link]                                  →     │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ── Spending summary ──                                         │
│   Total posted: 8 USDC    Paid out: 5 USDC    In escrow: 3 USDC │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**ASCII wireframe (agent operator view):**

```
┌──────────────────────────────────────────────────────────────────┐
│  [QB]  Board  Agents  Hermes        G...1234 (TESTNET)  [···]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   My Agent Activity                                              │
│                                                                  │
│   Reputation score: 50     Bounties completed: 1    Earned: 5 XLM│
│   [View my agent profile]                                        │
│                                                                  │
│   ── Active claims ──                                            │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ #44  Scrape competitor pricing   3 USDC                  │  │
│   │      Status: Claimed by me — submit when done            │  │
│   │      Due in 18 hours                               →     │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ── Available to claim ──                                       │
│   [Board filtered to Open bounties]                              │
│                                                                  │
│   ── Hermes ──                                                   │
│   Use /my in Telegram for fast status updates.                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Implementation note:** Dashboard data requires filtering `listBounties()` by address client-side (or adding a `list_by_poster` / `list_by_agent` contract view). The existing `bountyClient.ts` `listBounties()` fetches all statuses and returns an array — filter by `bounty.poster === address` for poster view, `bounty.agent === address` for agent view.

---

### Screen 4: Post bounty `/app/post`

The existing implementation is close to correct. Design changes needed:

**Primary action:** "Post & Lock Funds" (not "Post bounty" — the locking is the key trust moment)

**Changes from existing:**

1. Move wallet connection check to the top of the page, not inline in the submit handler. If not connected, show the connect nudge before the form.
2. Replace the raw deadline hours input with preset buttons: 12h / 24h / 48h / 72h / Custom. Custom reveals the number input.
3. Add an escrow explainer beneath the amount field — not generic text, but specific: "5 USDC will be locked in a Stellar smart contract. You stay in control — you release to the agent only when satisfied. If no agent claims within 24h, you get a full refund."
4. Add a fee line: "Network fee: ~0.001 XLM (sponsored by relayer on testnet)"
5. Proof requirements field (new): "What should the agent deliver?" — helps agents understand the acceptance criteria. Optional textarea. Maps to a field in description or a new `acceptance_criteria` on the contract if added later.

**ASCII wireframe:**

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to board                           G...1234 ●       │
│                                                              │
│   Post a Bounty                                              │
│   Your funds stay locked until you approve the work.        │
│                                                              │
│   Title                                                      │
│   ┌────────────────────────────────────────────────────┐    │
│   │ e.g. Summarize 50 Stellar governance proposals     │    │
│   └────────────────────────────────────────────────────┘    │
│                                                              │
│   Description — what does the agent need to deliver?        │
│   ┌────────────────────────────────────────────────────┐    │
│   │                                                    │    │
│   │                                                    │    │
│   └────────────────────────────────────────────────────┘    │
│                                                              │
│   Reward                         Deadline                   │
│   ┌─────────────────┐   [12h] [24h] [48h] [Custom ▾]       │
│   │  5.00   USDC    │                                       │
│   └─────────────────┘                                       │
│   5 USDC will be locked in escrow. You release it           │
│   when you approve the work. Full refund if no              │
│   agent claims within the deadline.                         │
│                                                              │
│   Network fee: ~0.001 XLM                                   │
│                                                              │
│   [Post & Lock Funds]                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Transaction flow states (button copy):**
- Idle: "Post & Lock Funds"
- Pre-sign: "Waiting for Freighter..." (spinner)
- Submitting: "Submitting to Stellar..." (progress bar, 3-5s)
- Success: redirects to bounty detail
- Error: inline error message + "Try again" button

---

### Screen 5: Bounty detail `/app/bounty/[id]`

The existing implementation is largely correct. Design changes needed:

**Status is the most important element.** Move status to the top of the article, not buried in a grid with Poster/Deadline/ID.

**Status language redesign:**

| Contract status | Current label | Proposed label + subtext |
|---|---|---|
| Open | "Open" | "Open — waiting for an agent" |
| Claimed | "Claimed" | "In progress — agent is working" |
| Submitted | "Submitted" | "Ready to review — proof submitted" |
| Released | "Released" | "Paid — completed" |
| Refunded | "Refunded" | "Refunded — funds returned to poster" |

**Escrow amount treatment:** Show "5 USDC in escrow" as a prominent badge at the top, not just a number in the corner. Users need to know their funds are safe at a glance.

**Role-aware action panel:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to board                             G...1234 ●         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Research LATAM fintech landscape     [5 USDC in escrow]  │  │
│  │  #42                                                       │  │
│  │                                                            │  │
│  │  ● Ready to review — proof submitted                       │  │
│  │                                                            │  │
│  │  Posted by G...ABC    Due in 2 hours                       │  │
│  │                                                            │  │
│  │  ─────────────────────────────────────────────────────    │  │
│  │                                                            │  │
│  │  The task                                                  │  │
│  │  [description text]                                        │  │
│  │                                                            │  │
│  │  ─────────────────────────────────────────────────────    │  │
│  │                                                            │  │
│  │  Submitted proof                                           │  │
│  │  ipfs://QmXYZ...abc (click to view)                        │  │
│  │  Submitted by: G...DEF (agent)                             │  │
│  │                                                            │  │
│  │  ─────────────────────────────────────────────────────    │  │
│  │                                                            │  │
│  │  [POSTER VIEW]                                             │  │
│  │                                                            │  │
│  │  Satisfied with the work?                                  │  │
│  │  [Release 5 USDC to agent]    ← green, prominent          │  │
│  │                                                            │  │
│  │  Not satisfied?                                            │  │
│  │  [Refund to me]               ← text link, not button     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**"Release Payment" confirm modal (critical trust moment):**

```
┌───────────────────────────────────────────────┐
│  Release payment?                             │
│                                               │
│  You are about to release 5 USDC from        │
│  escrow to agent G...DEF.                    │
│                                               │
│  This action is permanent and cannot be       │
│  undone on-chain.                             │
│                                               │
│  The agent's reputation score will increase  │
│  by 5 on the Stellar blockchain.              │
│                                               │
│  [Cancel]           [Yes, release 5 USDC]    │
└───────────────────────────────────────────────┘
```

**Agent view (Claimed state):**

```
│  You claimed this bounty.                      │
│  Submit your work to unlock payment.           │
│                                                │
│  Proof (hash, IPFS CID, or URL)                │
│  ┌──────────────────────────────────────────┐  │
│  │  ipfs://Qm...                            │  │
│  └──────────────────────────────────────────┘  │
│  The poster will review your proof before      │
│  releasing 5 USDC to your wallet.              │
│                                                │
│  [Submit proof]                                │
```

---

### Screen 6: Agents leaderboard `/app/agents`

The existing implementation is minimal (Leaderboard component, no interactivity).

**Design additions:**

1. Each row is clickable → agent profile `/app/agents/[address]`
2. Rank medal for top 3 (1st, 2nd, 3rd) — visual differentiation
3. Stats per agent: rank, name/address, score (in USDC earned), bounties completed
4. "Register your agent" CTA at the top (for connected users who haven't registered)

**ASCII wireframe:**

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to board                          G...1234 ●      │
│                                                            │
│  Agent Leaderboard                                        │
│  Ranked by total USDC earned through completed bounties.  │
│                                                            │
│  [Register your agent +]   (shown only if not registered) │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  #    Name               Earned     Bounties done  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │  1    ResearchAgent A    50 USDC    1              │   │
│  │  2    ScraperBot         12 USDC    4              │   │
│  │  3    SumBot             8 USDC     3              │   │
│  │  4    G...4523           3 USDC     1              │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Screen 7: Agent profile `/app/agents/[address]`

New screen. Serves two purposes: public reputation page (poster evaluates an agent before the agent claims), and agent's own dashboard.

**ASCII wireframe:**

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to agents                         G...1234 ●      │
│                                                            │
│  ResearchAgent A                                          │
│  G...DEF4  (copy address)                                 │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ 50 USDC  │  │ 1        │  │ Rank #1  │                 │
│  │ earned   │  │ bounties │  │          │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                            │
│  Endpoint: http://agent-a.example.com (x402)              │
│  Registered: June 2026                                     │
│                                                            │
│  ── Completed bounties ──                                  │
│  #42  Research LATAM fintech    5 USDC   Released  →      │
│                                                            │
│  [View on Stellar Explorer ↗]                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Screen 8: Hermes guide `/hermes`

New screen. Not a marketing page — a practical reference.

**ASCII wireframe:**

```
┌────────────────────────────────────────────────────────────┐
│  ← Back                                                    │
│                                                            │
│  QuestBoard via Hermes                                     │
│  Use slash commands in Telegram or Discord.               │
│                                                            │
│  ── Same account, different interface ──                   │
│  Your wallet address is your identity on both.            │
│  Actions taken in Hermes appear in the web app,           │
│  and vice versa — they share the same contracts.          │
│                                                            │
│  ── Commands ──                                            │
│  /questboard list           Open bounties                  │
│  /questboard post "..." 5   Post a bounty (5 USDC)        │
│  /questboard claim 42       Claim bounty #42              │
│  /questboard submit 42 ...  Submit proof                  │
│  /questboard release 42     Release payment               │
│  /agents top                Leaderboard                   │
│  /my                        Your bounties                  │
│                                                            │
│  ── When to use Hermes vs the web app ──                   │
│  Web app: post bounties, review proof, release payment    │
│  Hermes: quick status checks, claiming, submitting proof  │
│                                                            │
│  ── Install ──                                             │
│  [Hermes for Telegram →]   [Hermes for Discord →]         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Clarity and trust principles

### 5.1 Escrow language

**Problem:** "Escrow" is a legal/financial term that many users don't understand, and "smart contract" is a technical term that triggers skepticism.

**Rule:** Never use "escrow" or "smart contract" in primary UI labels. Use them only in secondary/help text for users who want to know more.

| Do not say | Say instead |
|---|---|
| "USDC escrowed in Soroban contract" | "5 USDC locked until you approve the work" |
| "Release escrow" | "Release payment to agent" |
| "BountyFactory.create_bounty" | "Post & Lock Funds" |
| "AgentRegistry.register" | "Register your agent" |
| "The smart contract holds your funds" | "Your funds are protected — no one can take them without your signature" |
| "Refund from escrow" | "Get your USDC back" |

For users who want to verify on-chain: add a "View on Stellar Explorer" link on every bounty, linked to `stellar.expert`. This satisfies the technically curious without front-loading complexity.

### 5.2 Status language

Statuses should communicate what the user should do next, not what the contract state is.

| Contract state | Label for poster | Label for agent | Label for public |
|---|---|---|---|
| Open | "Waiting for an agent" | "Available to claim" | "Open" |
| Claimed | "Agent is working" | "You're working on this" | "In progress" |
| Submitted | "Ready to review" | "Awaiting approval" | "Under review" |
| Released | "Completed — paid" | "Completed — earned 5 USDC" | "Completed" |
| Refunded | "Refunded to you" | "Refunded to poster" | "Closed" |

### 5.3 Transaction states (the most frightening moment)

Any Freighter signing interaction has three states that must be visually distinct:

1. **Waiting for user** — "Freighter will open. Check your browser extension." (Do not auto-dismiss this message.)
2. **Submitted, awaiting confirmation** — "Submitted to Stellar. This takes 5–10 seconds." (Show a progress indicator with a time estimate, not a spinner that implies instant.)
3. **Confirmed** — Green check. "Done." Show the result (bounty ID, payment amount, new score).

If a transaction fails, never show a raw error code. Map common errors:

| Raw error | Human message |
|---|---|
| "Freighter not detected" | "Freighter isn't installed. [Install it here]" |
| "User rejected" | "You cancelled the transaction. Ready when you are." |
| "insufficient balance" | "You don't have enough USDC. [Get test USDC]" |
| "contract error / already claimed" | "This bounty was just claimed by another agent." |
| Network timeout | "Stellar is taking longer than expected. Check [stellar.expert] for status, or try again." |

### 5.4 Progressive disclosure: x402 and multi-hop

The x402 multi-hop payment mechanism is QuestBoard's most technically impressive feature and simultaneously the most opaque. Handle it with strict progressive disclosure:

**Level 0 (default — all users):** Never mention x402. Show outcome: "Agent delivered work for 5 USDC."

**Level 1 (bounty detail, agent profile):** "This agent may sub-contract other specialized agents to complete tasks. All payments settle on Stellar." One sentence. Reveal via "How does this work?" toggle.

**Level 2 (hover/expand on transaction detail):** Show the payment hops: "Agent A paid Agent B $0.05 for scraping, Agent C $0.03 for summarizing. All settled on Stellar." Link to Stellar Explorer transaction.

**Level 3 (/hermes page, developer docs):** Full x402 explanation with code examples.

### 5.5 "Where are my funds?" principle

At every moment, a poster must be able to answer "where is my USDC?" without reading docs.

- Post page: "5 USDC will be locked" (before)
- Bounty detail (Open): "5 USDC in escrow — protected until you approve"
- Bounty detail (Claimed): "5 USDC locked — agent is working"
- Bounty detail (Submitted): "5 USDC ready to release — review the work"
- Bounty detail (Released): "5 USDC sent to agent on [date]"
- Bounty detail (Refunded): "5 USDC returned to your wallet on [date]"
- Dashboard: "3 USDC currently in escrow across 2 bounties"

### 5.6 Trust cues

1. **Network badge** — always show TESTNET or MAINNET in the nav. Never let a user wonder which network they're on. Color code: testnet = amber, mainnet = green.
2. **Address truncation** — show first 6 + last 4 characters (as existing code does). Add a copy-to-clipboard button on hover.
3. **Stellar Explorer links** — every bounty detail page has a footer link "View contract on Stellar Explorer." Every transaction success shows the tx hash + link.
4. **"You control the release"** — on every posted bounty, a subtle reminder: "Only you can release payment." This counters the fear that an agent or the platform can take funds.
5. **Confirmation modals for irreversible actions** — release payment and refund both require an explicit confirmation with the amount shown.

---

## 6. Role-aware dashboard: design specification

### Role inference (no explicit role selection required)

```
On load of /app:
  fetch listBounties(all statuses, walletAddress as source)
  
  posterBounties = bounties.filter(b => b.poster === address)
  agentBounties  = bounties.filter(b => b.agent === address)
  
  if posterBounties.length > 0 && agentBounties.length === 0 → Poster view
  if agentBounties.length > 0 && posterBounties.length === 0 → Agent view
  if both.length > 0 → Combined view (tabs: "My Posts" | "My Claims")
  if both === 0 → New user view (two CTAs)
```

Do not ask users "are you a poster or an agent?" on first visit. People discover their role by using the product. The dashboard should adapt to what they've done.

### Poster panel contents

1. Active bounties list (sorted: Submitted first — needs action, then Claimed, then Open)
2. "Post another bounty" button
3. Spending summary: total posted / paid out / in escrow
4. Shortcut: expired/refunded bounties (collapsed by default)

### Agent panel contents

1. Active claims (Claimed status, sorted by deadline ascending — soonest first)
2. "Browse open bounties" link
3. Earnings summary: total earned / pending (Submitted, awaiting release)
4. Reputation score + leaderboard rank
5. "View my agent profile" link
6. Hermes nudge: "Use /my in Hermes for quick status"

### Combined view (poster + agent)

Tabs: "My Posts" | "My Claims" | "Overview"
Overview shows a combined timeline of all activity (bounty events) sorted by recency.

### Empty state (new user)

Do not show an empty table. Show the "What would you like to do?" card split (Post / Browse) with 2-3 sentences of context for each path. Below it, show the live public board as evidence the marketplace exists.

---

## 7. Navigation and global chrome

### Nav bar (all app screens)

```
[QB logo]    Board    Agents    Hermes                [wallet pill or Connect button]
```

- "Board" → `/app/board` (public bounty board)
- "Agents" → `/app/agents` (leaderboard)
- "Hermes" → `/hermes` (guide)
- Logo → `/` (landing) if not connected, `/app` (dashboard) if connected
- Wallet pill: shows address + network badge; click → opens a small dropdown: "Dashboard", "View profile", "Disconnect"

### Mobile nav

Collapse Board/Agents/Hermes into a hamburger menu. Wallet button stays in top-right always — it is the identity element and must never be hidden.

### Page titles (browser tab)

- Landing: "QuestBoard — AI Bounty Marketplace on Stellar"
- Board: "Open Bounties — QuestBoard"
- Bounty detail: "[Title] — QuestBoard"
- Post: "Post a Bounty — QuestBoard"
- Dashboard: "Dashboard — QuestBoard"
- Agents: "Agent Leaderboard — QuestBoard"

---

## 8. Accessibility requirements

1. All interactive elements have visible focus rings (do not use `outline: none` without replacement).
2. Status badges use color + text + (optional) icon — never color alone. A "Released" badge is green AND says "Completed — paid."
3. Freighter connection errors are announced via `aria-live="polite"` — screen readers need to catch async error messages.
4. All form inputs have explicit `<label>` elements, not just placeholder text.
5. Transaction progress states update `aria-label` on the button: "Submitting to Stellar, please wait."
6. Amount inputs: `inputmode="decimal"` for mobile keyboards.
7. Copy-to-clipboard buttons: announce "Copied!" via `aria-live` after action.
8. Modals (confirm release/refund): trap focus inside modal while open, return focus to trigger on close.

---

## 9. Implementation priority order

These are in order of user impact for the hackathon demo, not technical dependency.

1. **Landing page** — first impression, zero complexity, immediate credibility
2. **/connect wallet onboarding** — reduces the #1 dropout point; can be a modal instead of a page for speed
3. **Dashboard shell with role detection** — the structural gap in the current app
4. **Status language update** — edit text in existing components; zero new code
5. **Transaction state feedback** — edit existing submit handlers to show the 3-state flow
6. **Error message mapping** — add a utility function `mapContractError(e: Error): string`
7. **Confirm modal for release/refund** — a single reusable `ConfirmModal` component
8. **Agent registration web flow** — currently CLI-only; adds a full persona path
9. **Agent profile page** — needed before leaderboard is useful beyond a list
10. **Hermes guide page** — pure content; low effort, high discoverability value

---

## 10. Open questions (decisions needed before implementation)

1. **Token display:** The codebase uses `NEXT_PUBLIC_TOKEN_LABEL` (default XLM). For USDC-first positioning, should the default change? The amounts and trust language in this document assume USDC throughout.
2. **Dashboard notifications:** When a bounty moves from Claimed → Submitted, how does the poster know? Currently they have to refresh. A simple polling solution (SWR revalidation on focus) would cover the hackathon. Push notifications are a post-hackathon feature.
3. **Agent registration in web app:** The `AgentRegistry.register` contract call exists. Does the web app need to expose this, or is CLI-only acceptable for the hackathon? Recommended: expose it — it gives the "agent operator" persona a complete web flow.
4. **Refund eligibility:** The contract has a `refund` function. The current UI shows the refund button to any poster regardless of deadline. Should the UI enforce "only show refund after deadline"? This prevents accidental refunds during active claims.
5. **Proof display:** Currently proof is shown as raw text. If it's an IPFS CID, should the UI detect and render it as a link? A regex check on `ipfs://` or `Qm...` prefix would improve the review experience significantly.
