#!/usr/bin/env bash
#
# Endpoint integration smoke for the x402 agent server.
# Boots the server and asserts the PAID endpoints challenge with HTTP 402 when
# called without payment — i.e. the x402 paywall is actually enforced.
#
# Requires agent/x402-demo/.env.local (a valid RELAYER_API_KEY for the
# facilitator). Skips cleanly if that isn't present, so it never breaks CI.
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/agent/x402-demo"
PORT="${AGENTS_PORT:-4021}"
LOG="$(mktemp -t qb-agents.XXXX.log)"

if [ ! -f "$DIR/.env.local" ] && [ -z "${RELAYER_API_KEY:-}" ]; then
  echo "skip: no agent/x402-demo/.env.local (set RELAYER_API_KEY to run the live 402 smoke)"
  exit 0
fi
[ -d "$DIR/node_modules" ] || (cd "$DIR" && npm install >/dev/null 2>&1)

echo "── booting agent server on :$PORT ──"
(cd "$DIR" && AGENTS_PORT="$PORT" npm run agents >"$LOG" 2>&1) &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT

# wait up to ~20s for the port to accept connections
up=0
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$PORT/scrape"; then up=1; break; fi
  sleep 0.5
done
if [ "$up" != "1" ]; then echo "✗ server did not start — see $LOG"; tail -5 "$LOG"; exit 1; fi

fail=0
expect402() { # label, curl-args...
  local label="$1"; shift
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  if [ "$code" = "402" ]; then
    echo "✓ $label → 402 Payment Required (paywall enforced)"
  else
    echo "✗ $label → $code (expected 402)"; fail=1
  fi
}

expect402 "GET /scrape"    "http://localhost:$PORT/scrape?urls=https://stellar.org"
expect402 "POST /summarize" -X POST "http://localhost:$PORT/summarize" -H 'content-type: application/json' -d '{"items":[]}'

if [ $fail -eq 0 ]; then echo "Endpoint smoke passed."; else echo "Endpoint smoke FAILED — see $LOG"; exit 1; fi
