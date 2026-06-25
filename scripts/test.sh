#!/usr/bin/env bash
#
# QuestBoard — unified test runner.
# Runs every suite in the repo and prints one pass/fail summary.
#
#   ./scripts/test.sh            # run all suites
#   ./scripts/test.sh contracts  # run one (contracts|agent|app|mcp)
#
# A suite whose toolchain is missing is SKIPPED (reported), not failed —
# so you can run the JS suites without Rust installed, etc. Exit code is
# non-zero iff a suite that actually ran failed. CI runs all suites.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ONLY="${1:-all}"

PASS=(); FAIL=(); SKIP=()
run() { # name, "command"
  local name="$1"; shift
  echo ""; echo "──────── $name ────────"
  if bash -c "$*"; then PASS+=("$name"); else FAIL+=("$name"); fi
}
have() { command -v "$1" >/dev/null 2>&1; }
want() { [ "$ONLY" = "all" ] || [ "$ONLY" = "$1" ]; }

# 1) Soroban contracts — Rust unit tests
if want contracts; then
  if have cargo; then
    run "contracts (cargo test)" "cargo test --manifest-path '$ROOT/contracts/Cargo.toml' --quiet"
  else SKIP+=("contracts: cargo not installed"); fi
fi

# 2) Agent runtime — Vitest (work logic + acceptance policy)
if want agent; then
  if have npm; then
    [ -d "$ROOT/agent/x402-demo/node_modules" ] || (cd "$ROOT/agent/x402-demo" && npm install >/dev/null 2>&1)
    run "agent (vitest)" "cd '$ROOT/agent/x402-demo' && npm test --silent"
  else SKIP+=("agent: npm not installed"); fi
fi

# 3) Web app — Vitest (labels / UI helpers)
if want app; then
  if have npm; then
    [ -d "$ROOT/app/node_modules" ] || (cd "$ROOT/app" && npm install >/dev/null 2>&1)
    run "app (vitest)" "cd '$ROOT/app' && npm test --silent"
  else SKIP+=("app: npm not installed"); fi
fi

# 4) MCP server — pytest (ABI encoding correctness)
if want mcp; then
  if have python3; then
    VENV="$ROOT/agent/mcp-server/.venv"
    if [ ! -d "$VENV" ]; then
      python3 -m venv "$VENV"
      "$VENV/bin/pip" install -q -r "$ROOT/agent/mcp-server/requirements.txt" -r "$ROOT/agent/mcp-server/requirements-dev.txt"
    fi
    run "mcp (pytest)" "cd '$ROOT/agent/mcp-server' && '$VENV/bin/python' -m pytest tests/ -q"
  else SKIP+=("mcp: python3 not installed"); fi
fi

echo ""; echo "════════ summary ════════"
for s in "${PASS[@]:-}"; do [ -n "$s" ] && echo "  ✓ $s"; done
for s in "${SKIP[@]:-}"; do [ -n "$s" ] && echo "   skip $s"; done
for s in "${FAIL[@]:-}"; do [ -n "$s" ] && echo "  ✗ $s"; done
[ ${#FAIL[@]} -eq 0 ] && { echo "All suites passed."; exit 0; } || { echo "${#FAIL[@]} suite(s) failed."; exit 1; }
