"""
QuestBoard wallet helpers.
"""

import os
from stellar_sdk import Keypair, Server

TESTNET_RPC = "https://horizon-testnet.stellar.org"


def load_wallet() -> dict:
    """Load wallet from env. Raises if not set."""
    secret = os.environ.get("QUESTBOARD_WALLET_SECRET", "")
    if not secret:
        raise RuntimeError(
            "QUESTBOARD_WALLET_SECRET not set. "
            "Fund a testnet account via https://friendbot.stellar.org "
            "and export the secret."
        )
    kp = Keypair.from_secret(secret)
    return {
        "address": kp.public_key,
        "secret": secret,
    }