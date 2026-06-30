# Pitch Deck (`/pitchdeck`)

The pitch-deck page for the Stellar PULSO submission. For the full branch overview see
[`docs/BRANCH-NOTES.md`](BRANCH-NOTES.md).

## The page

A self-contained, full-viewport slide deck served at **`/pitchdeck`** (`app/app/pitchdeck/`).

- **9 slides**: title · problem · solution · how it works · the wedge ("pay only if it passes")
  · what's built (verified on testnet) · architecture · why Stellar · closing.
- **Navigation**: click the left/right half of the screen, arrow keys (`←` `→`, also `Space` /
  `PageUp`/`PageDown`, `Home`/`End`), or the progress dots. A subtle **✕** (top-right) returns home.
- **Discovery**: linked from the nav bar as **"Learn more"** (`SiteHeader`). Marked
  **`robots: noindex`** so it stays out of search engines.
- **Content** is drafted from the README and the verified happy-path flows; copy is easy to edit in
  `app/app/pitchdeck/PitchDeck.tsx` (the `slides` array). No customer-discovery claims included.

## Deploy

The deck must be reachable for the submission. The app deploys to Vercel on push to `main`, so
**`/pitchdeck` goes live once this work reaches `main`** — Julio handles the deploy at end of day.
