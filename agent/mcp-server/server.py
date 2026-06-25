"""
QuestBoard MCP server.

Exposes QuestBoard bounty marketplace operations as MCP tools for Hermes Agent.

Transport: stdio (JSON-RPC 2.0)
SDK: mcp (Anthropic Python SDK)

Tools:
- questboard_list_bounties
- questboard_create_bounty
- questboard_claim_bounty
- questboard_submit_proof
- questboard_release_payment
- questboard_get_leaderboard
- questboard_get_my_bounties
"""

import os
import sys
import json
from typing import Any

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    print("error: pip install mcp", file=sys.stderr)
    sys.exit(1)

from bounty import (
    list_open_bounties,
    create_bounty,
    claim_bounty,
    submit_proof,
    release_payment,
    get_bounty_status,
)
from registry import (
    get_leaderboard,
    get_agent_profile,
    register_agent,
)
from wallet import load_wallet

BOUNTY_FACTORY_ID = os.environ.get("QUESTBOARD_BOUNTY_FACTORY_ID", "")
AGENT_REGISTRY_ID = os.environ.get("QUESTBOARD_AGENT_REGISTRY_ID", "")
NETWORK = os.environ.get("QUESTBOARD_NETWORK", "testnet")

server = Server("questboard-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="questboard_list_bounties",
            description="List open bounties on the QuestBoard.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 20},
                    "status": {
                        "type": "string",
                        "enum": ["Open", "Claimed", "Submitted", "Released", "Refunded", "All"],
                        "default": "All",
                    },
                },
            },
        ),
        Tool(
            name="questboard_create_bounty",
            description="Create a new bounty with USDC escrow on Stellar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "amount_usdc": {"type": "number"},
                    "deadline_hours": {"type": "integer", "default": 24},
                },
                "required": ["title", "description", "amount_usdc"],
            },
        ),
        Tool(
            name="questboard_claim_bounty",
            description="Claim an open bounty as an agent.",
            inputSchema={
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "integer"},
                    "agent_endpoint": {"type": "string"},
                },
                "required": ["bounty_id"],
            },
        ),
        Tool(
            name="questboard_submit_proof",
            description="Submit proof-of-work for a claimed bounty.",
            inputSchema={
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "integer"},
                    "proof_hash": {"type": "string"},
                    "ipfs_cid": {"type": "string"},
                },
                "required": ["bounty_id", "proof_hash"],
            },
        ),
        Tool(
            name="questboard_release_payment",
            description="Approve and release the escrow payment to the agent.",
            inputSchema={
                "type": "object",
                "properties": {
                    "bounty_id": {"type": "integer"},
                },
                "required": ["bounty_id"],
            },
        ),
        Tool(
            name="questboard_get_leaderboard",
            description="Get top agents by reputation score.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 10},
                },
            },
        ),
        Tool(
            name="questboard_get_my_bounties",
            description="Get bounties where user is poster or agent.",
            inputSchema={
                "type": "object",
                "properties": {
                    "address": {"type": "string"},
                },
                "required": ["address"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    try:
        if name == "questboard_list_bounties":
            return await handle_list_bounties(arguments)
        elif name == "questboard_create_bounty":
            return await handle_create_bounty(arguments)
        elif name == "questboard_claim_bounty":
            return await handle_claim_bounty(arguments)
        elif name == "questboard_submit_proof":
            return await handle_submit_proof(arguments)
        elif name == "questboard_release_payment":
            return await handle_release_payment(arguments)
        elif name == "questboard_get_leaderboard":
            return await handle_get_leaderboard(arguments)
        elif name == "questboard_get_my_bounties":
            return await handle_get_my_bounties(arguments)
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def handle_list_bounties(args: dict) -> list[TextContent]:
    status = args.get("status", "All")
    limit = args.get("limit", 20)
    bounties = list_open_bounties(BOUNTY_FACTORY_ID, status, limit)
    return [TextContent(type="text", text=json.dumps({
        "bounties": bounties,
        "count": len(bounties),
    }, indent=2))]


async def handle_create_bounty(args: dict) -> list[TextContent]:
    title = args["title"]
    description = args["description"]
    amount = args["amount_usdc"]
    deadline_hours = args.get("deadline_hours", 24)
    wallet = load_wallet()
    result = create_bounty(
        BOUNTY_FACTORY_ID,
        wallet["address"],
        wallet["secret"],
        title,
        description,
        amount,
        deadline_hours,
    )
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def handle_claim_bounty(args: dict) -> list[TextContent]:
    bounty_id = args["bounty_id"]
    endpoint = args.get("agent_endpoint", "")
    wallet = load_wallet()
    result = claim_bounty(
        BOUNTY_FACTORY_ID,
        bounty_id,
        wallet["address"],
        wallet["secret"],
        endpoint,
    )
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def handle_submit_proof(args: dict) -> list[TextContent]:
    bounty_id = args["bounty_id"]
    proof_hash = args["proof_hash"]
    ipfs = args.get("ipfs_cid", "")
    wallet = load_wallet()
    result = submit_proof(
        BOUNTY_FACTORY_ID,
        bounty_id,
        wallet["address"],
        wallet["secret"],
        proof_hash,
        ipfs,
    )
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def handle_release_payment(args: dict) -> list[TextContent]:
    bounty_id = args["bounty_id"]
    # Safety check: only release if status is Submitted
    status = get_bounty_status(BOUNTY_FACTORY_ID, bounty_id)
    if status.get("status") != "Submitted":
        return [TextContent(type="text", text=json.dumps({
            "error": f"Cannot release payment: bounty status is {status.get('status')}, expected 'Submitted'",
            "bounty_id": bounty_id,
        }, indent=2))]
    wallet = load_wallet()
    result = release_payment(
        BOUNTY_FACTORY_ID,
        bounty_id,
        wallet["address"],
        wallet["secret"],
    )
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def handle_get_leaderboard(args: dict) -> list[TextContent]:
    limit = args.get("limit", 10)
    agents = get_leaderboard(AGENT_REGISTRY_ID, limit)
    return [TextContent(type="text", text=json.dumps({
        "agents": agents,
        "count": len(agents),
    }, indent=2))]


async def handle_get_my_bounties(args: dict) -> list[TextContent]:
    address = args["address"]
    # Placeholder: in production, query Soroban RPC for bounties
    # where poster == address OR agent == address
    return [TextContent(type="text", text=json.dumps({
        "address": address,
        "bounties": [],
        "note": "My bounties query not yet implemented (MVP placeholder)",
    }, indent=2))]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())