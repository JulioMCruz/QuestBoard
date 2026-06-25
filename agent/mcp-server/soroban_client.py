"""
Shared Soroban RPC client for the QuestBoard MCP server.

Wraps the two things every contract call needs but the old code skipped:

  1. `prepare_transaction` — Soroban invoke transactions MUST be simulated first so
     the RPC can attach the resource footprint, auth entries, and resource fee.
     Building + signing + submitting without this (as the original code did) always
     fails on-chain.
  2. Result extraction — the return value of a contract call lives in the
     transaction's Soroban meta, not in a top-level field.

Two entry points:
  - `invoke()` — state-changing call: prepare → sign → send → poll → parse return.
  - `read()`   — read-only call: simulate only (no signature, no fee, no ledger write).
"""

import os

from stellar_sdk import (
    Keypair,
    Network,
    SorobanServer,
    TransactionBuilder,
    scval,
    xdr as stellar_xdr,
)
from stellar_sdk.exceptions import PrepareTransactionException
from stellar_sdk.soroban_rpc import GetTransactionStatus, SendTransactionStatus

RPC_URL = os.environ.get("QUESTBOARD_SOROBAN_RPC", "https://soroban-testnet.stellar.org")
NETWORK_PASSPHRASE = os.environ.get(
    "QUESTBOARD_NETWORK_PASSPHRASE", Network.TESTNET_NETWORK_PASSPHRASE
)
# Inclusion fee (stroops) per op. The Soroban resource fee is added by prepare_transaction.
BASE_FEE = int(os.environ.get("QUESTBOARD_BASE_FEE", "10000"))


def _server() -> SorobanServer:
    return SorobanServer(RPC_URL)


def default_source_pubkey() -> str | None:
    """Public key used as the source for read-only simulations."""
    pub = os.environ.get("QUESTBOARD_WALLET_ADDRESS")
    if pub:
        return pub
    sec = os.environ.get("QUESTBOARD_WALLET_SECRET")
    if sec:
        return Keypair.from_secret(sec).public_key
    return None


def _return_value(meta_xdr: str | None):
    """Pull the SCVal return value out of the transaction's Soroban meta (v3/v4)."""
    if not meta_xdr:
        return None
    tm = stellar_xdr.TransactionMeta.from_xdr(meta_xdr)
    for attr in ("v4", "v3"):
        v = getattr(tm, attr, None)
        sm = getattr(v, "soroban_meta", None) if v is not None else None
        if sm is not None and sm.return_value is not None:
            return scval.to_native(sm.return_value)
    return None


def invoke(contract_id: str, fn: str, params: list, source_secret: str) -> dict:
    """
    Run a state-changing contract call end-to-end.

    Returns {"ok": True, "tx_hash": ..., "return": <parsed return value>} on success,
    or {"ok": False, "error": "..."} on any failure (with enough context to debug).
    """
    if not contract_id:
        return {"ok": False, "error": "contract id not set"}

    server = _server()
    try:
        kp = Keypair.from_secret(source_secret)
        source = server.load_account(kp.public_key)
        tx = (
            TransactionBuilder(source, NETWORK_PASSPHRASE, base_fee=BASE_FEE)
            .append_invoke_contract_function_op(contract_id, fn, params)
            .set_timeout(300)
            .build()
        )
        # REQUIRED: simulate to attach footprint + auth + resource fee.
        tx = server.prepare_transaction(tx)
    except PrepareTransactionException as e:
        return {"ok": False, "error": f"simulation failed: {e.simulate_transaction_response.error}"}
    except Exception as e:  # noqa: BLE001 — surface anything (bad key, RPC down, missing account)
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}

    tx.sign(kp)
    send = server.send_transaction(tx)
    if send.status != SendTransactionStatus.PENDING:
        return {
            "ok": False,
            "error": f"send rejected ({send.status}): {getattr(send, 'error_result_xdr', None)}",
        }

    result = server.poll_transaction(send.hash)
    if result.status != GetTransactionStatus.SUCCESS:
        return {
            "ok": False,
            "error": f"transaction {result.status}",
            "tx_hash": send.hash,
        }

    return {"ok": True, "tx_hash": send.hash, "return": _return_value(result.result_meta_xdr)}


def read(contract_id: str, fn: str, params: list, source_pubkey: str | None = None) -> dict:
    """
    Run a read-only contract call via simulation (no signing, no submission).

    Returns {"ok": True, "value": <parsed SCVal>} or {"ok": False, "error": "..."}.
    """
    if not contract_id:
        return {"ok": False, "error": "contract id not set"}
    source_pubkey = source_pubkey or default_source_pubkey()
    if not source_pubkey:
        return {"ok": False, "error": "no source account for read (set QUESTBOARD_WALLET_SECRET)"}

    server = _server()
    try:
        source = server.load_account(source_pubkey)
        tx = (
            TransactionBuilder(source, NETWORK_PASSPHRASE, base_fee=BASE_FEE)
            .append_invoke_contract_function_op(contract_id, fn, params)
            .set_timeout(300)
            .build()
        )
        sim = server.simulate_transaction(tx)
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}

    if sim.error:
        return {"ok": False, "error": f"simulate error: {sim.error}"}
    if not sim.results or sim.results[0].xdr is None:
        return {"ok": True, "value": None}
    return {"ok": True, "value": scval.to_native(sim.results[0].xdr)}
