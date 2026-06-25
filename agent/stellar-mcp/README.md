# QuestBoard — Stellar MCP Integration

This directory contains the Stellar MCP (Model Context Protocol) integration
for QuestBoard. It uses [JulioMCruz/Stellar-mcp](https://github.com/JulioMCruz/Stellar-mcp)
as the canonical MCP server for all Stellar interactions.

## Why Stellar-mcp?

Instead of maintaining custom Python wrappers for Soroban RPC, we use the
official Stellar MCP server which provides 30+ tools including:

- `stellar_soroban_simulate` — Simulate contract calls
- `stellar_soroban_invoke` — Invoke + sign + submit transactions
- `stellar_soroban_get_events` — Query contract events
- `stellar_soroban_read_state` — Read contract state
- `stellar_get_account` — Account balances + info
- `stellar_soroban_scaffold_contract` — Generate Soroban contract workspaces
- `stellar_nextjs_wallet_scaffold` — Generate Next.js wallet components
- `stellar_x402_perkos_guide` — x402 architecture and safety rules
- `stellar_x402_nextjs_scaffold` — x402 paid routes

## Setup

```bash
cd agent/stellar-mcp
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in:

```bash
# Network
STELLAR_NETWORK=testnet

# Contract IDs (from deployment)
STELLAR_BOUNTY_FACTORY_ID=C...   # QuestBoard BountyFactory
STELLAR_AGENT_REGISTRY_ID=C...   # QuestBoard AgentRegistry

# RPC endpoints (optional)
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org

# Signing policy
STELLAR_AUTO_SIGN_POLICY=safe

# Optional: testnet signing key
# STELLAR_SECRET_KEY=SD...
```

## Usage with Hermes Agent

In your `hermes config`:

```yaml
mcp_servers:
  stellar:
    type: stdio
    command: node
    args: ["/ABSOLUTE/PATH/TO/QuestBoard/agent/stellar-mcp/node_modules/@juliomcruz/stellarmcp/build/src/index.js"]
    env:
      STELLAR_NETWORK: "testnet"
      STELLAR_BOUNTY_FACTORY_ID: "C..."
      STELLAR_AGENT_REGISTRY_ID: "C..."
```

## QuestBoard-specific Stellar-mcp flows

### Create bounty

```json
{
  "name": "stellar_soroban_invoke",
  "arguments": {
    "contractId": "C...",
    "function": "create_bounty",
    "args": [
      {"address": "G..."},
      {"bytes": "Research LATAM fintech"},
      {"bytes": "1500 words covering DeFi protocols"},
      {"address": "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"},
      {"i128": "50000000"},
      {"u64": "86400"}
    ]
  }
}
```

### Claim bounty

```json
{
  "name": "stellar_soroban_invoke",
  "arguments": {
    "contractId": "C...",
    "function": "claim_bounty",
    "args": [
      {"u64": "42"},
      {"address": "G...AGENT_A"}
    ]
  }
}
```

### Release payment

```json
{
  "name": "stellar_soroban_invoke",
  "arguments": {
    "contractId": "C...",
    "function": "release_payment",
    "args": [{"u64": "42"}]
  }
}
```

### Get leaderboard

```json
{
  "name": "stellar_soroban_read_state",
  "arguments": {
    "contractId": "C...",
    "key": {"symbol": "leaderboard"}
  }
}
```

### Multi-hop x402 agent payments

For Agent A paying Agent B + C via x402:

```json
{
  "name": "stellar_submit_payment",
  "arguments": {
    "destination": "G...AGENT_B",
    "amount": "5000000",
    "assetCode": "USDC",
    "assetIssuer": "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
  }
}
```

## Reference

- Stellar-mcp repo: https://github.com/JulioMCruz/Stellar-mcp
- Stellar-mcp tools: https://github.com/JulioMCruz/Stellar-mcp/blob/main/docs/TOOLS.md
- Stellar-mcp coding guide: https://github.com/JulioMCruz/Stellar-mcp/blob/main/docs/AGENT_SOROBAN_CODING_GUIDE.md
- MCP protocol: https://modelcontextprotocol.io

## License

MIT