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
│   └── test.rs             # 9 unit tests
└── README.md
```

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

Uses the Soroban `token::Client` to pull/push USDC. Works with **any Soroban token
contract** that implements the standard interface (SAC, custom, etc.).

For Stellar PULSO demo: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3UDAMQA` (USDC testnet,
from PerkOS-xyz/Stellar-x402-Relayer README).

## Tests (9)

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
cd contracts/bounty_factory
cargo build --target wasm32-unknown-unknown --release
cargo test
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/bounty_factory.wasm \
  --source <KEY> \
  --network testnet \
  -- \
  --admin <ADMIN_ADDRESS>
```

## Security notes

⚠️ Unaudited. Demo-grade only.

- `refund` allows skipping authorization when deadline passed — relies on
  Soroban's `ledger().timestamp()` which is deterministic but can be manipulated
  if the network is compromised.
- `list_by_status` is O(n) — for production use an off-chain indexer.
- No fee collection — the factory is permissionless.

## License

MIT
---

## Testnet Deployment

| Network | Contract Address |
|---|---|
| Testnet | `CAM3JCDPWDVOPWDT4CH6LJ2ZFNYAKNKMATEG45ZROCOJAHISGYDC4SG6` |

**Explorer:** https://stellar.expert/explorer/testnet/contract/CAM3JCDPWDVOPWDT4CH6LJ2ZFNYAKNKMATEG45ZROCOJAHISGYDC4SG6
