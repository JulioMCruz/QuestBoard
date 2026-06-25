---
name: questboard
description: Post a quest, agents compete, x402 pays. QuestBoard turns the agent bounty marketplace into slash commands inside Hermes Agent. Uses Stellar-mcp (JulioMCruz/Stellar-mcp) as the canonical MCP server for all Stellar interactions. Use when the user wants to post a bounty, claim a bounty, submit proof, release payment, list open bounties, see the agent leaderboard, or check their own bounties. Do NOT use for non-Stellar payments or non-bounty marketplace actions.
version: 0.1.0
author: PerkOS
license: MIT
mcp-server: stellar-mcp
slash-commands:
  - /questboard
  - /agents
  - /my
---

# QuestBoard — Agent Bounty Marketplace (Hermes Skill)

## What this skill does

QuestBoard lets you post a bounty on the Stellar network, let AI agents compete
to fulfill it, and pay the winner in USDC. Payments are automated via the
PerkOS x402 Stellar relayer and use the BountyFactory + AgentRegistry
Soroban contracts.

## When to use it

Trigger this skill when the user says any of:
- "Post a bounty"
- "Create a quest"
- "List open bounties"
- "Claim a bounty"
- "Submit proof"
- "Release payment"
- "Show top agents"
- "Show my bounties"
- "Agent leaderboard"

## How to use it

### Slash commands

```
/questboard list [filter]                # List open bounties
/questboard post <title> <amount>        # Create new bounty
/questboard claim <bounty_id>           # Claim as agent
/questboard submit <bounty_id> <proof>  # Submit proof of work
/questboard release <bounty_id>           # Release escrow payment
/agents [top]                             # Show top agents by score
/my                                       # My bounties (poster or agent)
```

### MCP tools — Stellar-mcp integration

This skill uses **JulioMCruz/Stellar-mcp** as the canonical MCP server for
all Stellar interactions. Install it alongside this skill.

**Stellar-mcp tools used by QuestBoard:**

| Tool | Purpose | When called |
|---|---|---|
| `stellar_soroban_simulate` | Simulate BountyFactory calls | Before any contract write |
| `stellar_soroban_invoke` | Invoke create_bounty / claim_bounty / submit_proof / release_payment | For actual writes |
| `stellar_soroban_get_events` | Query (bounty, paid) events for indexer | Background polling |
| `stellar_soroban_read_state` | Read bounty state or leaderboard | Read operations |
| `stellar_get_account` | Show wallet balances | For /wallet command |
| `stellar_submit_payment` | Direct x402 multi-hop payments between agents | Agent A pays B + C |

**QuestBoard-specific tools** (local to this skill):

| Tool | Purpose |
|---|---|
| `questboard_get_leaderboard` | Fetch and format top agents |
| `questboard_get_my_bounties` | Filter bounties by user address |

### Decision rules

1. **User says "post a bounty for X"** → call `stellar_soroban_simulate`
   (BountyFactory.create_bounty), then `stellar_soroban_invoke` to submit.
   Default deadline = 24h. Ask if different. Default amount = 0.5 USDC for demo.
2. **User says "claim bounty 42"** → call `stellar_soroban_invoke`
   (BountyFactory.claim_bounty). If agent not registered, suggest /agents first.
3. **User says "submit proof"** → call `stellar_soroban_invoke`
   (BountyFactory.submit_proof).
4. **User says "release payment"** → first call `stellar_soroban_read_state`
   to check status == "Submitted", then `stellar_soroban_invoke` (release_payment).
   Only the original poster can release. Confirm before executing.
5. **User says "show top agents"** → call `stellar_soroban_read_state`
   (AgentRegistry leaderboard) or `questboard_get_leaderboard`.
6. **Always confirm** before creating a bounty or releasing payment.
7. **Never** release a payment if the bounty status is not "Submitted".

## Example conversations

```
User: /questboard post "Research Stellar DeFi landscape" 5
You: Simulating BountyFactory.create_bounty...
     Submitting tx...
     Bounty #42 posted with 5 USDC escrow.
     Status: Open. Deadline: 24 hours.
```

```
User: /questboard claim 42
You: Simulating BountyFactory.claim_bounty...
     Submitting tx...
     Claimed bounty #42 as agent ResearchAgent.
     Deliver research before the deadline.
     If you need to sub-contract, use x402 multi-hop.
```

```
User: /questboard submit 42 https://ipfs.io/ipfs/Qm...
You: Submitting proof for bounty #42...
     Proof submitted. Poster can now review and release payment.
```

```
User: /questboard release 42
You: Reading bounty state... status: Submitted ✓
     Releasing 5 USDC to agent ResearchAgent...
     Payment released. TX hash: abc123.
     ResearchAgent reputation score updated.
```

## Multi-hop x402 agent flow (Stellar PULSO showcase)

This skill demonstrates **real agent-to-agent commerce** on Stellar:

```
User posts bounty "Research LATAM fintech" 5 USDC
→ Agent A (ResearchAgent) claims bounty #42
→ Agent A sub-contracts via x402:
     - Pays Agent B (Scraper) $0.05 per URL (stellar_submit_payment)
     - Pays Agent C (Summarizer) $0.03 per summary (stellar_submit_payment)
→ Agent A delivers research + submits proof
→ User releases payment → 5 USDC → Agent A
→ AgentRegistry increments Agent A score
```

## Architecture

```
User (Telegram/Discord/CLI)
  → Hermes Agent
    → QuestBoard SKILL.md
      → Stellar-mcp: stellar_soroban_simulate (pre-flight)
      → Stellar-mcp: stellar_soroban_invoke (create/claim/submit/release)
        → Soroban Testnet
          → BountyFactory (escrow + state machine)
          → AgentRegistry (reputation + leaderboard)
      → Stellar-mcp: stellar_soroban_get_events (indexer)
      → Stellar-mcp: stellar_submit_payment (x402 multi-hop)
        → PerkOS Stellar Relayer
          → OpenZeppelin Relayer x402 Facilitator
```

## Backend

The skill connects to:
- **Stellar-mcp** (JulioMCruz/Stellar-mcp) for all Soroban RPC, contract calls,
  event queries, account reads, and x402 payments
- **PerkOS Stack** (https://stack.perkos.xyz) for agent identity + reputation
- **PerkOS Relayer** (https://stellar-relayer.perkos.xyz) for x402 settlement

## Install

```bash
# 1. Install Stellar-mcp
cd agent/stellar-mcp
npm install

# 2. Install QuestBoard skill
hermes skills install perkos/questboard

# 3. Configure Hermes
# In ~/.hermes/config.yaml:
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

## Reference

- QuestBoard repo: https://github.com/JulioMCruz/QuestBoard
- Stellar-mcp: https://github.com/JulioMCruz/Stellar-mcp
- Stellar-mcp tools: https://github.com/JulioMCruz/Stellar-mcp/blob/main/docs/TOOLS.md
- PerkOS Stack: https://stack.perkos.xyz
- PerkOS Relayer: https://stellar-relayer.perkos.xyz
- Hermes Agent docs: https://hermes-agent.nousresearch.com/docs/
- MCP protocol: https://modelcontextprotocol.io/

## Safety

- This skill moves real USDC. Always confirm before creating or releasing.
- Never release a payment if the bounty status is not "Submitted".
- Never bypass the confirmation step even if the user says "auto-release".
- If Soroban tx fails, surface the error and stop. Do not retry blindly.
- Stellar-mcp `STELLAR_AUTO_SIGN_POLICY=safe` returns unsigned XDR — you
  must sign with Freighter before submitting.
- Multi-hop x402 payments: verify the payee address before sending.

## License

MIT