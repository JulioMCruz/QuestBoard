# contracts/bounty_factory/ — Soroban BountyFactory

Core contract for the QuestBoard bounty marketplace. Holds USDC in escrow, manages the
bounty state machine, and emits events that the AgentRegistry listens to.

## State machine

```
Open ──claim──> Claimed ──submit──> Submitted ──release──> Released (paid)
  │                │                                          │
  └─────refund─────┴──────────────────refund──────────────────┘
                                                         Refunded
```

## File layout

```
contracts/bounty_factory/
├── Cargo.toml              # Package manifest
├── src/
│   ├── lib.rs              # Contract impl + state machine
│   └── test.rs             # 10 unit tests
└── README.md
```

## Deployed (Stellar testnet)

| | Contract ID |
|---|---|
| **BountyFactory** | `CDFHTM4NKHFQFXY6VO4HPHWNOY56XIB3BI5HCHGTJ2GUJML3CLA2VPZ6` |

Deployed and verified end-to-end on 2026-06-24 (create → escrow → claim → submit →
release → agent paid, plus the refund path). Escrow was exercised with the native
XLM SAC. [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDFHTM4NKHFQFXY6VO4HPHWNOY56XIB3BI5HCHGTJ2GUJML3CLA2VPZ6)

## Public API

```rust
pub fn init(env: Env, admin: Option<Address>);

pub fn create_bounty(
    env: Env,
    poster: Address,
    title: String,
    description: String,
    amount: i128,
    token: Address,
    deadline_hours: u32,
) -> u64;

pub fn claim_bounty(env: Env, bounty_id: u64, agent: Address);
pub fn submit_proof(env: Env, bounty_id: u64, agent: Address, proof: String);
pub fn release_payment(env: Env, bounty_id: u64);
pub fn refund(env: Env, bounty_id: u64);

pub fn get_bounty(env: Env, bounty_id: u64) -> Option<Bounty>;
pub fn list_by_status(env: Env, status: BountyStatus) -> Vec<u64>;
```

## Events

| Topic | Data | Triggered on |
|---|---|---|
| `(bounty, created)` | `(id, poster, amount)` | `create_bounty` |
| `(bounty, claimed)` | `(id, agent)` | `claim_bounty` |
| `(bounty, submitted)` | `(id, agent)` | `submit_proof` |
| `(bounty, paid)` | `(id, agent, amount)` | `release_payment` (consumed by AgentRegistry indexer) |
| `(bounty, refunded)` | `(id, poster)` | `refund` |

The `(bounty, paid)` event is what AgentRegistry listens for to bump agent scores.

## Token

Uses the Soroban `token::Client` to pull/push tokens. Works with **any Soroban token
contract** that implements the standard interface (SAC, custom, etc.).

- **Verified with:** the native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
  (no trustline required, so it's the simplest token for end-to-end testing).
- **USDC testnet SAC:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  ⚠️ Classic-asset SACs require the **recipient to hold a trustline** before
  `transfer`/`mint` will succeed — established separately, not by this contract.
  (An earlier 50-char value floating around the repo was truncated/invalid.)

## Tests (10)

| Test | What it covers |
|---|---|
| `test_init_creates_factory` | init() doesn't panic |
| `test_create_bounty_locks_funds` | USDC transferred from poster to escrow |
| `test_full_lifecycle_release_to_agent` | create → claim → submit → release, funds to agent |
| `test_only_claiming_agent_can_submit` | agent B can't submit agent A's bounty |
| `test_refund_when_open` | poster can refund before claim |
| `test_cannot_claim_twice` | claimed bounties reject new claims |
| `test_cannot_release_unsubmitted` | must submit before release |
| `test_list_by_status_returns_open_bounties` | indexer-friendly listing |
| `test_create_bounty_rejects_zero_amount` | amount > 0 enforced |
| `test_create_bounty_rejects_zero_deadline` | deadline_hours > 0 enforced |

## Reference

- Soroban escrow pattern: <https://developers.stellar.org/docs/build/smart-contracts/example-contracts/escrow>
- Soroban token client: <https://docs.rs/soroban-sdk/latest/soroban_sdk/token/struct.Client.html>
- Soroban events: <https://developers.stellar.org/docs/learn/smart-contract-internals/events>

## Build / test / deploy

```bash
# From contracts/ (workspace root). The crate sets
# [lib] crate-type = ["cdylib","rlib"] so the build emits wasm.
cargo test                                   # 10 unit tests

stellar contract build                       # -> target/wasm32v1-none/release/bounty_factory.wasm

stellar contract deploy \
  --wasm target/wasm32v1-none/release/bounty_factory.wasm \
  --source <KEY> --network testnet
# init is a separate call (NOT a constructor); admin is optional:
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- init --admin null
```

> Note: `stellar contract build` (CLI ≥ 23) targets `wasm32v1-none`. Install it once
> with `rustup target add wasm32v1-none`.

## Security notes

⚠️ Unaudited. Demo-grade only.

- `release_payment` only pays in the **Submitted** state — the agent must submit
  proof first, so a poster can't release before any work is delivered.
- `refund` allows skipping authorization when deadline passed — relies on
  Soroban's `ledger().timestamp()` which is deterministic but can be manipulated
  if the network is compromised.
- `list_by_status` is O(n) — for production use an off-chain indexer.
- No fee collection — the factory is permissionless.

## License

MIT