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
│   └── test.rs             # 11 unit tests
└── README.md
```

## Deployed (Stellar testnet)

| | Contract ID |
|---|---|
| **AgentRegistry** | `CCHFKVBTJHZEQVKA7H3MLY36SPRJHRH2IDLUWS3XY2DKIF5N5Y3TRBID` |

Deployed and verified end-to-end on 2026-06-24 (register → record_payment →
leaderboard, and the auth-bypass attack is now rejected).
[stellar.expert](https://stellar.expert/explorer/testnet/contract/CCHFKVBTJHZEQVKA7H3MLY36SPRJHRH2IDLUWS3XY2DKIF5N5Y3TRBID)

> ⚠️ A first deployment (`CCTGTFYT5VYHAIV6POOHS7D55TMTCRV7LABRZYWNX4W4H7WSUF2RSMY5`)
> contained the `record_payment` auth bypass — **do not use it.** The address above
> is the fixed build.

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

## Tests (11)

| Test | What it covers |
|---|---|
| `test_init` | init() doesn't panic |
| `test_register_agent` | register creates a profile |
| `test_cannot_register_twice` | double-register panics |
| `test_update_profile` | partial update works |
| `test_record_payment_by_admin` | admin can record + score grows |
| `test_record_payment_rejects_non_admin` | non-admin caller rejected |
| `test_record_payment_requires_caller_signature` | passing the admin's address without its signature is rejected (auth-bypass regression) |
| `test_record_payment_rejects_unregistered_agent` | must register first |
| `test_leaderboard_returns_sorted_top_n` | selection sort descending |
| `test_leaderboard_limit_larger_than_count` | handles limit overflow |
| `test_leaderboard_empty` | empty registry returns empty |

## Build / test / deploy

```bash
# From contracts/ (workspace root). The crate sets
# [lib] crate-type = ["cdylib","rlib"] so the build emits wasm.
cargo test                                   # 11 unit tests

stellar contract build                       # -> target/wasm32v1-none/release/agent_registry.wasm

stellar contract deploy \
  --wasm target/wasm32v1-none/release/agent_registry.wasm \
  --source <KEY> --network testnet
# init is a separate call (NOT a constructor) and admin is required:
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- init --admin <ADMIN_ADDRESS>
```

> Note: `stellar contract build` (CLI ≥ 23) targets `wasm32v1-none`. Install it once
> with `rustup target add wasm32v1-none`.

## Security notes

⚠️ Unaudited.

- `record_payment` calls `caller.require_auth()` **and** checks `caller == admin`.
  The `require_auth` is essential: without it, anyone could pass the admin's
  (public) address as `caller` and forge reputation. The address check alone is
  NOT sufficient.
- Admin-gated — losing the admin key = losing reputation control.
- `get_leaderboard` is O(n²) selection sort — fine for <100 agents, replace with
  off-chain indexer for production scale.
- No fee collection.

## License

MIT