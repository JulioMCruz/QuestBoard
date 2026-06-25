# contracts/agent_registry/ — Soroban AgentRegistry

On-chain registry of agent identities with reputation scoring. Works alongside
`contracts/bounty_factory/` — when a bounty is paid, the indexer calls
`record_payment()` to bump the agent's score.

## File layout

```
contracts/agent_registry/
├── Cargo.toml
├── src/
│   ├── lib.rs              # Contract impl
│   └── test.rs             # 9 unit tests
└── README.md
```

## Public API

```rust
pub fn init(env: Env, admin: Address);

pub fn register(env: Env, agent: Address, name: String, endpoint: String, description: String);
pub fn update_profile(env: Env, agent: Address, name: Option<String>, endpoint: Option<String>, description: Option<String>);

pub fn record_payment(env: Env, caller: Address, agent: Address, amount: i128);

pub fn get_agent(env: Env, agent: Address) -> Option<AgentProfile>;
pub fn get_leaderboard(env: Env, limit: u32) -> Vec<(Address, i128)>;
pub fn agent_count(env: Env) -> u32;
```

## AgentProfile

```rust
pub struct AgentProfile {
    pub address: Address,
    pub name: String,
    pub endpoint: String,    // HTTP endpoint that accepts x402 requests
    pub description: String,
    pub score: i128,          // cumulative paid amount in token base units
    pub bounties_done: u32,
    pub registered_at: u64,
}
```

## Events

| Topic | Data | Notes |
|---|---|---|
| `(agent, registered)` | (address) | on register |
| `(agent, updated)` | (address) | on update_profile |
| `(agent, paid)` | (address, amount) | on record_payment |

## Indexer pattern

The BountyFactory emits `(bounty, paid)` events. A trusted off-chain indexer
watches these events (via Soroban RPC `getEvents`) and calls
`record_payment(admin, agent, amount)` on this contract.

This decouples the two contracts:
- Cross-contract calls cost gas on every paid bounty
- The indexer batches and amortizes
- Either contract can be upgraded independently

For Stellar PULSO demo: the indexer is a small Node.js worker in `app/lib/poller.ts`
that polls Horizon/Soroban RPC every 5s.

## ERC-8004 compatibility

The `endpoint` field matches the ERC-8004 agent metadata schema. PerkOS Stack's
`GET /api/erc8004/identity/{address}` can serve this profile to agents that
want to discover QuestBoard agents.

## Tests (9)

| Test | What it covers |
|---|---|
| `test_init` | init() doesn't panic |
| `test_register_agent` | register creates a profile |
| `test_cannot_register_twice` | double-register panics |
| `test_update_profile` | partial update works |
| `test_record_payment_by_admin` | admin can record + score grows |
| `test_record_payment_rejects_non_admin` | non-admin caller rejected |
| `test_record_payment_rejects_unregistered_agent` | must register first |
| `test_leaderboard_returns_sorted_top_n` | selection sort descending |
| `test_leaderboard_limit_larger_than_count` | handles limit overflow |
| `test_leaderboard_empty` | empty registry returns empty |

## Build / test / deploy

```bash
cd contracts/agent_registry
cargo build --target wasm32-unknown-unknown --release
cargo test
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/agent_registry.wasm \
  --source <KEY> \
  --network testnet \
  -- \
  --admin <ADMIN_ADDRESS>
```

## Security notes

⚠️ Unaudited.

- `record_payment` is admin-gated — losing the admin key = losing reputation control
- `get_leaderboard` is O(n²) selection sort — fine for <100 agents, replace with
  off-chain indexer for production scale
- No fee collection

## License

MIT
---

## Testnet Deployment

| Network | Contract Address |
|---|---|
| Testnet | `CASIVMH4EMUZZEUIDDTRZGG6JCB7WLWSZ33NVDGZQOPHA3HTGPS2F5CW` |

**Explorer:** https://stellar.expert/explorer/testnet/contract/CASIVMH4EMUZZEUIDDTRZGG6JCB7WLWSZ33NVDGZQOPHA3HTGPS2F5CW
