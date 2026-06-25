#!/usr/bin/env bash
#
# Contract tests for the Soroban smart contracts.
#
#   ./scripts/test-contracts.sh             # Rust unit tests (deterministic, offline)
#   ./scripts/test-contracts.sh --testnet   # + read-only smoke against the deployed testnet contracts
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "── Soroban unit tests ──"
cargo test --manifest-path "$ROOT/contracts/Cargo.toml" --quiet || exit 1

[ "${1:-}" = "--testnet" ] || exit 0

echo ""; echo "── read-only testnet smoke ──"
RPC="${NEXT_PUBLIC_SOROBAN_RPC:-https://soroban-testnet.stellar.org}"
BF="${NEXT_PUBLIC_BOUNTY_FACTORY_ID:-CDFHTM4NKHFQFXY6VO4HPHWNOY56XIB3BI5HCHGTJ2GUJML3CLA2VPZ6}"
AR="${NEXT_PUBLIC_AGENT_REGISTRY_ID:-CCHFKVBTJHZEQVKA7H3MLY36SPRJHRH2IDLUWS3XY2DKIF5N5Y3TRBID}"

latest=$(curl -s "$RPC" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["sequence"])' 2>/dev/null)
if [ -z "${latest:-}" ]; then echo "✗ RPC unreachable: $RPC"; exit 1; fi
echo "✓ RPC reachable — latest ledger $latest"

start=$(( latest > 8000 ? latest - 8000 : 1 ))
for pair in "BountyFactory:$BF" "AgentRegistry:$AR"; do
  name="${pair%%:*}"; cid="${pair##*:}"
  body=$(printf '{"jsonrpc":"2.0","id":1,"method":"getEvents","params":{"startLedger":%d,"filters":[{"type":"contract","contractIds":["%s"]}],"pagination":{"limit":5}}}' "$start" "$cid")
  n=$(curl -s "$RPC" -H 'content-type: application/json' -d "$body" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print("ERR" if "error" in d else len(d["result"]["events"]))' 2>/dev/null)
  if [ "$n" = "ERR" ] || [ -z "$n" ]; then echo "✗ $name ($cid): RPC error"; exit 1; fi
  echo "✓ $name reachable — $n recent event(s) in last 8000 ledgers"
done
echo "Testnet smoke passed."
