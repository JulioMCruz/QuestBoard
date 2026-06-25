#!/usr/bin/env bash
#
# Seed the deployed testnet contracts with realistic demo data so the app isn't
# empty: a few open bounties + a couple of registered agents.
#
# Uses the local Stellar CLI key store under contracts/.stellar (keys: qb-poster,
# qb-agent-b, qb-agent-c). Amounts are in base units (7 decimals): 10000000 = 1 XLM.
#
# Usage:  ./scripts/seed.sh
set -uo pipefail

BF="${BOUNTY_FACTORY_ID:-CDFHTM4NKHFQFXY6VO4HPHWNOY56XIB3BI5HCHGTJ2GUJML3CLA2VPZ6}"
AR="${AGENT_REGISTRY_ID:-CCHFKVBTJHZEQVKA7H3MLY36SPRJHRH2IDLUWS3XY2DKIF5N5Y3TRBID}"
XLM="${TOKEN_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
NET=testnet
POSTER=qb-poster

# Run from contracts/ so the local key store resolves.
cd "$(dirname "$0")/../contracts" || exit 1

post() { # title desc amount deadline_hours
  local addr id
  addr=$(stellar keys address "$POSTER" 2>/dev/null)
  id=$(stellar contract invoke --id "$BF" --source "$POSTER" --network "$NET" -- \
        create_bounty --poster "$addr" --title "$1" --description "$2" \
        --amount "$3" --token "$XLM" --deadline_hours "$4" 2>/dev/null)
  echo "  posted #${id:-?} — $1"
}

register() { # key name endpoint desc
  local addr
  addr=$(stellar keys address "$1" 2>/dev/null)
  if stellar contract invoke --id "$AR" --source "$1" --network "$NET" -- \
       register --agent "$addr" --name "$2" --endpoint "$3" --description "$4" >/dev/null 2>&1; then
    echo "  registered $2"
  else
    echo "  $2 already registered (skipped)"
  fi
}

echo "Seeding bounties on $NET..."
post "Research LATAM fintech landscape"   "1500-word brief on Soroban DeFi and on/off ramps across Brazil, Mexico, Colombia." 30000000 48
post "Translate whitepaper to Portuguese" "Translate the 12-page protocol whitepaper from EN to PT-BR." 20000000 72
post "Summarize 50 Stellar proposals"     "One-paragraph summaries of the latest 50 SEP/CAP proposals, returned as JSON." 15000000 24
post "Scrape competitor pricing pages"    "Pull pricing from 10 named SaaS competitors into a clean CSV." 25000000 36

echo "Registering demo agents..."
register qb-agent-b "ScraperBot B"    "https://agent-b.example/x402"   "Scrapes URLs into structured data."
register qb-agent-c "SummarizerBot C" "https://agent-c.example/x402"   "Summarizes text and headlines."

echo "Done. Open the app — the board and leaderboard now have data."
