# QuestBoard — Soroban Contract Scaffold

Layout and conventions for the QuestBoard Soroban workspace (`contracts/`).

## File layout

```
contracts/
├── Cargo.toml              # Workspace root
├── Cargo.lock
├── bounty_factory/
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs
│   └── tests/
│       └── test.rs
└── agent_registry/
    ├── Cargo.toml
    ├── src/
    │   └── lib.rs
    └── tests/
        └── test.rs
```

## Build Commands

```bash
# Install wasm32 target
rustup target add wasm32v1-none

# Build all contracts
cd contracts
stellar contract build

# Deploy bounty_factory
stellar contract deploy \
  --wasm target/wasm32v1-none/release/bounty_factory.wasm \
  --source <KEY_NAME> \
  --network testnet

# Deploy agent_registry
stellar contract deploy \
  --wasm target/wasm32v1-none/release/agent_registry.wasm \
  --source <KEY_NAME> \
  --network testnet

# Generate TypeScript bindings
stellar contract bindings typescript \
  --contract-id <BOUNTY_FACTORY_ID> \
  --output-dir ./packages/bounty-bindings \
  --overwrite
```

## Contract Rules

- `#![no_std]`
- Small explicit public methods
- Exact integer types (u64, i128)
- Clear storage keys
- No secrets on-chain
- Testnet first

## Testing

```bash
cd contracts/bounty_factory
cargo test
cd ../agent_registry
cargo test
```

## Reference

- Same as VeilGate scaffold
- BountyFactory + AgentRegistry already implemented in PR #4 + #5

## License

MIT