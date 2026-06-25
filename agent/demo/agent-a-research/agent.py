"""
Agent A — ResearchAgent (demo).

This agent:
1. Lists open bounties via the QuestBoard MCP server
2. Claims a bounty
3. Sub-contracts via x402 to Agent B (scraper) + Agent C (summarizer)
4. Delivers research + submits proof
5. Gets paid when the poster releases the bounty

Run: python3 agent-a-research.py --bounty-id 42
"""

import sys
import os
import asyncio

# Allow importing MCP server modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "mcp-server"))

from wallet import load_wallet
from bounty import claim_bounty, submit_proof
from x402 import x402_pay

# Demo agent endpoints (would be real agent cards in production)
AGENT_B_SCRAPER = os.environ.get("AGENT_B_ADDRESS", "GB...AGENT_B")
AGENT_C_SUMMARIZER = os.environ.get("AGENT_C_ADDRESS", "GB...AGENT_C")

# Rates (in stroops; 1 USDC = 10_000_000 stroops)
SCRAPER_RATE = 500_000    # $0.05
SUMMARIZER_RATE = 300_000  # $0.03


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Agent A — ResearchAgent")
    parser.add_argument("--bounty-id", type=int, default=42)
    args = parser.parse_args()

    wallet = load_wallet()
    print(f"[Agent A] Address: {wallet['address']}")
    print(f"[Agent A] Claiming bounty #{args.bounty_id}...")

    # 1. Claim bounty
    result = claim_bounty(
        os.environ.get("QUESTBOARD_BOUNTY_FACTORY_ID", ""),
        args.bounty_id,
        wallet["address"],
        wallet["secret"],
        "https://research-agent.example.com",
    )
    print(f"[Agent A] Claim result: {result}")

    # 2. Multi-hop: pay Agent B for scraping
    print(f"[Agent A] Paying Agent B (scraper) {SCRAPER_RATE} stroops...")
    pay_b = x402_pay(
        wallet["secret"],
        AGENT_B_SCRAPER,
        SCRAPER_RATE,
        description="Scrape 10 LATAM fintech URLs",
    )
    print(f"[Agent A] Payment to B: {pay_b}")

    # 3. Multi-hop: pay Agent C for summarization
    print(f"[Agent A] Paying Agent C (summarizer) {SUMMARIZER_RATE} stroops...")
    pay_c = x402_pay(
        wallet["secret"],
        AGENT_C_SUMMARIZER,
        SUMMARIZER_RATE,
        description="Summarize scraped headlines",
    )
    print(f"[Agent A] Payment to C: {pay_c}")

    # 4. Submit proof (placeholder: real impl would deliver IPFS hash)
    proof_hash = hashlib.sha256(b"research-report-v1").hexdigest()
    print(f"[Agent A] Submitting proof: {proof_hash[:16]}...")
    submit = submit_proof(
        os.environ.get("QUESTBOARD_BOUNTY_FACTORY_ID", ""),
        args.bounty_id,
        wallet["address"],
        wallet["secret"],
        proof_hash,
        "",
    )
    print(f"[Agent A] Submit result: {submit}")

    print(f"[Agent A] Done. Waiting for poster to release payment...")


if __name__ == "__main__":
    import hashlib
    asyncio.run(main())