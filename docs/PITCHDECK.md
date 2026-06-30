# Pitch Deck (`/pitchdeck`) — branch notes

Notes for the team on the **`feat/pitchdeck`** branch and the pitch-deck page it adds.

## The page

A self-contained, full-viewport slide deck for the Stellar PULSO submission, served at
**`/pitchdeck`** (`app/app/pitchdeck/`).

- **9 slides**: title · problem · solution · how it works · the wedge ("pay only if it passes")
  · what's built (verified on testnet) · architecture · why Stellar · closing.
- **Navigation**: click left/right half of the screen, arrow keys (`←` `→`, also `Space` /
  `PageUp`/`PageDown`, `Home`/`End`), or the progress dots. A subtle **✕** (top-right) returns home.
- **Discovery**: linked from the nav bar as **"Learn more"** (`SiteHeader`). Marked
  **`robots: noindex`** so it stays out of search engines.
- **Content** is drafted from the README and the verified happy-path flows; copy is easy to edit
  in `app/app/pitchdeck/PitchDeck.tsx` (`slides` array). No customer-discovery claims included.

## Deploy

The deck must be reachable for the submission. The app deploys to Vercel on push to `main`, so
**`/pitchdeck` goes live once the branch reaches `main`** — **Julio handles the deploy at end of
day**. (No PR is being opened for this branch per the current workflow.)

## What this branch contains

`feat/pitchdeck` was branched from **`qa/full-suite`**, so it carries that branch's work in
addition to the deck. Versus `main`:

| File | What |
|---|---|
| `app/app/pitchdeck/PitchDeck.tsx` | The slide carousel (client component) |
| `app/app/pitchdeck/page.tsx` | Route + `noindex` metadata |
| `app/components/SiteHeader.tsx` | "Learn more" nav link → `/pitchdeck` |
| `docs/QA.md` | Functional / E2E QA report (from `qa/full-suite`) |
| `scripts/test.sh` | Cross-platform venv fix so the mcp suite runs on Windows (from `qa/full-suite`) |

Commits (newest first): `5e08132` nav link + close button · `cb02836` pitch deck carousel ·
`2379f9d` test runner fix + QA report.
