# Testing

QuestBoard has a test suite per layer, a single runner that ties them together,
and CI that runs everything on every push / PR.

## Run everything

```bash
./scripts/test.sh            # all suites, one pass/fail summary
./scripts/test.sh contracts  # just one: contracts | agent | app | mcp
```

A suite whose toolchain is missing is **skipped** (and reported), not failed —
so you can run the JS suites without Rust installed, etc. Exit code is non-zero
iff a suite that actually ran failed.

## The suites

| Layer | Framework | What it locks down | Run it directly |
|---|---|---|---|
| **Soroban contracts** | `cargo test` | Bounty lifecycle, auth rules, reputation math (21 unit tests in `contracts/*/src/test.rs`) | `cargo test --manifest-path contracts/Cargo.toml` |
| **Agent runtime** | Vitest | The real "work" agents do — HTML parsing, extractive summarization — and the **pay-on-acceptance policy** | `cd agent/x402-demo && npm test` |
| **MCP server** | pytest | **ABI encoding correctness** — SCVal order + types for every contract call, the class of bug that silently breaks invocations | `cd agent/mcp-server && pytest tests/` |
| **Web app** | Vitest | The plain-language UI layer — status labels, escrow lines, amount formatting, error humanization | `cd app && npm test` |

Why these: the unit suites are **deterministic and offline** — no testnet, no
secrets, no flakiness — so they're safe to gate CI on. They target the logic that
has actually broken before (contract auth, the Python↔contract ABI) plus the pure
business logic of each service.

## Integration smokes (live, opt-in)

These hit the real testnet / a running server, so they live outside the CI gate:

```bash
./scripts/test-contracts.sh --testnet   # read-only: confirms the deployed contracts are reachable on testnet
./scripts/test-endpoints.sh             # boots the x402 server, asserts the paid endpoints return HTTP 402 (paywall enforced)
```

`test-endpoints.sh` needs `agent/x402-demo/.env.local` (a valid `RELAYER_API_KEY`);
it skips cleanly if that isn't present.

## CI

`.github/workflows/test.yml` runs three jobs in parallel on every push to `main`
and every PR: **contracts** (cargo test), **js** (agent + app Vitest), and
**mcp** (pytest). All are offline and need no secrets.
