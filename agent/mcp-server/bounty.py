"""
QuestBoard bounty helpers — BountyFactory contract interactions.

ABI (must match contracts/bounty_factory/src/lib.rs exactly):
  create_bounty(poster: Address, title: String, description: String,
                amount: i128, token: Address, deadline_hours: u32) -> u64
  claim_bounty(bounty_id: u64, agent: Address)
  submit_proof(bounty_id: u64, agent: Address, proof: String)
  release_payment(bounty_id: u64)
  refund(bounty_id: u64)
  get_bounty(bounty_id: u64) -> Option<Bounty>
  list_by_status(status: BountyStatus) -> Vec<u64>
"""

import os

from stellar_sdk import scval

from soroban_client import invoke, read

# USDC and XLM both use 7 decimals on Stellar.
TOKEN_DECIMALS = 7

# Token escrowed by create_bounty. Defaults to the native XLM SAC (testnet), which
# needs no trustline — the simplest token to run end-to-end. Override with a USDC SAC
# via QUESTBOARD_TOKEN_ID (note: classic-asset SACs require recipient trustlines).
DEFAULT_TOKEN = os.environ.get(
    "QUESTBOARD_TOKEN_ID", "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
)

ALL_STATUSES = ["Open", "Claimed", "Submitted", "Released", "Refunded"]


def _to_base_units(amount: float) -> int:
    return int(round(float(amount) * (10**TOKEN_DECIMALS)))


def _addr_str(v):
    if v is None:
        return None
    a = getattr(v, "address", None)
    return a if a is not None else (v if isinstance(v, str) else str(v))


def _normalize_bounty(d: dict) -> dict:
    """Turn a raw to_native Bounty struct into a clean, JSON-serializable dict."""
    if not isinstance(d, dict):
        return {"raw": str(d)}
    status = d.get("status")
    if isinstance(status, (list, tuple)) and status:
        status = status[0]
    return {
        "id": d.get("id"),
        "status": status,
        "poster": _addr_str(d.get("poster")),
        "agent": _addr_str(d.get("agent")),
        "title": d.get("title"),
        "description": d.get("description"),
        "token": _addr_str(d.get("token")),
        "amount": str(d.get("amount")),
        "deadline": d.get("deadline"),
        "created_at": d.get("created_at"),
        "submission_proof": d.get("submission_proof"),
    }


# ---------------------------------------------- pure ABI param builders (testable)
# Order + SCVal types here MUST match contracts/bounty_factory/src/lib.rs exactly.


def create_bounty_params(source, title, description, amount, token, deadline_hours):
    return [
        scval.to_address(source),
        scval.to_string(title),
        scval.to_string(description),
        scval.to_int128(_to_base_units(amount)),
        scval.to_address(token),
        scval.to_uint32(int(deadline_hours)),
    ]


def claim_bounty_params(bounty_id, agent):
    return [scval.to_uint64(int(bounty_id)), scval.to_address(agent)]


def submit_proof_params(bounty_id, agent, proof):
    return [scval.to_uint64(int(bounty_id)), scval.to_address(agent), scval.to_string(proof)]


def bounty_id_params(bounty_id):
    return [scval.to_uint64(int(bounty_id))]


# --------------------------------------------------------------------------- reads


def get_bounty_status(contract_id: str, bounty_id: int) -> dict:
    """Read a single bounty via get_bounty(bounty_id)."""
    res = read(contract_id, "get_bounty", [scval.to_uint64(int(bounty_id))])
    if not res["ok"]:
        return {"status": "error", "error": res["error"]}
    if res["value"] is None:
        return {"status": "not_found", "bounty_id": bounty_id}
    return _normalize_bounty(res["value"])


def list_open_bounties(contract_id: str, status_filter: str, limit: int) -> list:
    """List bounties via list_by_status() + get_bounty() for each id."""
    statuses = ALL_STATUSES if status_filter in ("All", "", None) else [status_filter]

    ids: list[int] = []
    for st in statuses:
        res = read(contract_id, "list_by_status", [scval.to_enum(st, None)])
        if not res["ok"]:
            return [{"error": res["error"], "status_filter": st}]
        ids.extend(res["value"] or [])

    out = []
    for bid in ids[: int(limit)]:
        b = get_bounty_status(contract_id, bid)
        out.append(b)
    return out


# -------------------------------------------------------------------------- writes


def create_bounty(
    contract_id: str,
    source: str,
    secret: str,
    title: str,
    description: str,
    amount: float,
    deadline_hours: int,
    token: str | None = None,
) -> dict:
    token = token or DEFAULT_TOKEN
    params = create_bounty_params(source, title, description, amount, token, deadline_hours)
    res = invoke(contract_id, "create_bounty", params, secret)
    if not res["ok"]:
        return {"error": res["error"]}
    return {"status": "created", "tx_hash": res["tx_hash"], "bounty_id": res["return"]}


def claim_bounty(contract_id: str, bounty_id: int, agent: str, secret: str, endpoint: str = "") -> dict:
    # `endpoint` is not part of the contract ABI (claim_bounty(bounty_id, agent));
    # it is kept for caller compatibility but not sent on-chain.
    params = claim_bounty_params(bounty_id, agent)
    res = invoke(contract_id, "claim_bounty", params, secret)
    if not res["ok"]:
        return {"error": res["error"], "bounty_id": bounty_id}
    return {"status": "claimed", "tx_hash": res["tx_hash"], "bounty_id": bounty_id}


def submit_proof(contract_id: str, bounty_id: int, agent: str, secret: str, proof_hash: str, ipfs: str = "") -> dict:
    proof = f"{proof_hash}|ipfs:{ipfs}" if ipfs else proof_hash
    params = submit_proof_params(bounty_id, agent, proof)
    res = invoke(contract_id, "submit_proof", params, secret)
    if not res["ok"]:
        return {"error": res["error"], "bounty_id": bounty_id}
    return {"status": "submitted", "tx_hash": res["tx_hash"], "bounty_id": bounty_id}


def release_payment(contract_id: str, bounty_id: int, caller: str, secret: str) -> dict:
    # Only the stored poster is authorized on-chain; `secret` must be the poster's.
    params = bounty_id_params(bounty_id)
    res = invoke(contract_id, "release_payment", params, secret)
    if not res["ok"]:
        return {"error": res["error"], "bounty_id": bounty_id}
    return {"status": "released", "tx_hash": res["tx_hash"], "bounty_id": bounty_id}


def refund(contract_id: str, bounty_id: int, caller: str, secret: str) -> dict:
    params = bounty_id_params(bounty_id)
    res = invoke(contract_id, "refund", params, secret)
    if not res["ok"]:
        return {"error": res["error"], "bounty_id": bounty_id}
    return {"status": "refunded", "tx_hash": res["tx_hash"], "bounty_id": bounty_id}
