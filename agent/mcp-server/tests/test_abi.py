"""
ABI-encoding regression tests for the QuestBoard MCP server.

These lock the on-chain call shapes (SCVal order + types) against
contracts/bounty_factory/src/lib.rs and contracts/agent_registry/src/lib.rs.
A wrong type or argument order here is exactly the class of bug that silently
breaks invocations on-chain — so we assert the encoding without any network.
"""
import os
import sys
from types import SimpleNamespace

from stellar_sdk import scval, xdr

# import the module under test (no network: the RPC server is created lazily)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bounty  # noqa: E402
import registry  # noqa: E402

ADDR = "GB5IY6OELAKSTQPE3RCRWW6ZHK2YCQJIVOWBPXGWUPGRQWK6YECONDOE"
TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"


def _types(params):
    return [p.type for p in params]


# --------------------------------------------------------------- bounty_factory ABI


def test_create_bounty_param_types_and_order():
    p = bounty.create_bounty_params(ADDR, "Title", "Desc", 12.5, TOKEN, 24)
    assert _types(p) == [
        xdr.SCValType.SCV_ADDRESS,  # poster
        xdr.SCValType.SCV_STRING,   # title  (String, NOT Bytes)
        xdr.SCValType.SCV_STRING,   # description
        xdr.SCValType.SCV_I128,     # amount
        xdr.SCValType.SCV_ADDRESS,  # token
        xdr.SCValType.SCV_U32,      # deadline_hours (u32, NOT u64-seconds)
    ]


def test_create_bounty_amount_is_scaled_to_base_units():
    p = bounty.create_bounty_params(ADDR, "t", "d", 12.5, TOKEN, 1)
    assert scval.from_int128(p[3]) == 125_000_000  # 12.5 * 10**7


def test_claim_bounty_param_types():
    p = bounty.claim_bounty_params(7, ADDR)
    assert _types(p) == [xdr.SCValType.SCV_U64, xdr.SCValType.SCV_ADDRESS]
    assert scval.from_uint64(p[0]) == 7


def test_submit_proof_param_types():
    p = bounty.submit_proof_params(7, ADDR, "sha256:deadbeef")
    assert _types(p) == [
        xdr.SCValType.SCV_U64,
        xdr.SCValType.SCV_ADDRESS,
        xdr.SCValType.SCV_STRING,  # proof is a String
    ]
    assert scval.from_string(p[2]).decode() == "sha256:deadbeef"


def test_bounty_id_params_for_release_and_refund():
    p = bounty.bounty_id_params(42)
    assert _types(p) == [xdr.SCValType.SCV_U64]
    assert scval.from_uint64(p[0]) == 42


# ------------------------------------------------------------------ helpers


def test_to_base_units():
    assert bounty._to_base_units(1.0) == 10_000_000
    assert bounty._to_base_units(0.05) == 500_000
    assert bounty._to_base_units(0) == 0


def test_normalize_bounty_flattens_status_and_addresses():
    raw = {
        "id": 5,
        "status": ["Submitted"],                      # enum variant comes back as a list
        "poster": SimpleNamespace(address=ADDR),      # Address object
        "agent": ADDR,                                # already a string
        "title": "T",
        "description": "D",
        "token": SimpleNamespace(address=TOKEN),
        "amount": 30_000_000,
        "deadline": 100,
        "created_at": 1,
        "submission_proof": "sha256:x",
    }
    out = bounty._normalize_bounty(raw)
    assert out["status"] == "Submitted"
    assert out["poster"] == ADDR
    assert out["agent"] == ADDR
    assert out["token"] == TOKEN
    assert out["amount"] == "30000000"  # stringified for JSON safety


def test_normalize_bounty_handles_non_dict():
    assert "raw" in bounty._normalize_bounty(None)


# ------------------------------------------------------------------ agent_registry ABI

def test_register_param_types():
    p = registry.register_params(ADDR, "Agent A", "https://a.test", "does research")
    assert _types(p) == [
        xdr.SCValType.SCV_ADDRESS,
        xdr.SCValType.SCV_STRING,
        xdr.SCValType.SCV_STRING,
        xdr.SCValType.SCV_STRING,
    ]


def test_record_payment_param_types():
    # caller + agent + amount — caller is required so the contract can require_auth on it.
    p = registry.record_payment_params(ADDR, ADDR, 500_000)
    assert _types(p) == [
        xdr.SCValType.SCV_ADDRESS,  # caller
        xdr.SCValType.SCV_ADDRESS,  # agent
        xdr.SCValType.SCV_I128,     # amount
    ]
    assert scval.from_int128(p[2]) == 500_000
