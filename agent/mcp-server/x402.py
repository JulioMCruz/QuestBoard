"""
QuestBoard x402 multi-hop helpers.

Uses the PerkOS x402 Stellar relayer to pay between agents.
Reference: https://github.com/PerkOS-xyz/Stellar-x402-Relayer
"""

import os
import requests

PERKOS_RELAYER = os.environ.get("PERKOS_RELAYER_URL", "https://stellar-relayer.perkos.xyz")
PERKOS_STACK = os.environ.get("PERKOS_STACK_URL", "https://stack.perkos.xyz")


def x402_pay(
    from_secret: str,
    to_address: str,
    amount_stroops: int,
    description: str = "",
) -> dict:
    """
    Pay another agent via x402 using the PerkOS relayer.

    In the multi-hop demo:
      - Agent A pays Agent B $0.05 for scraped data
      - Agent A pays Agent C $0.03 for a summary
    Each is a separate x402 payment that Agent A initiates.
    """
    url = f"{PERKOS_RELAYER}/api/v2/x402/settle"
    payload = {
        "payer_secret": from_secret,
        "payee_address": to_address,
        "amount": str(amount_stroops),
        "network": "testnet",
        "description": description,
    }
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e)}


def x402_verify(payer_address: str, payee_address: str, amount_stroops: int) -> dict:
    """Check if a payment channel has sufficient balance."""
    url = f"{PERKOS_RELAYER}/api/v2/x402/verify"
    try:
        r = requests.post(url, json={
            "payer_address": payer_address,
            "payee_address": payee_address,
            "amount": str(amount_stroops),
        }, timeout=10)
        return r.json()
    except Exception as e:
        return {"error": str(e)}