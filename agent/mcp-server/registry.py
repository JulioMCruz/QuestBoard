"""
QuestBoard agent registry helpers — AgentRegistry contract interactions.

ABI (must match contracts/agent_registry/src/lib.rs exactly):
  register(agent: Address, name: String, endpoint: String, description: String)
  record_payment(caller: Address, agent: Address, amount: i128)   # caller must be admin + sign
  get_agent(agent: Address) -> Option<AgentProfile>
  get_leaderboard(limit: u32) -> Vec<(Address, i128)>
  agent_count() -> u32
"""

from stellar_sdk import scval

from soroban_client import invoke, read


def _addr_str(v):
    if v is None:
        return None
    a = getattr(v, "address", None)
    return a if a is not None else (v if isinstance(v, str) else str(v))


# --------------------------------------------------------------------------- reads


def get_leaderboard(contract_id: str, limit: int = 10) -> list:
    """get_leaderboard(limit) -> Vec<(Address, i128)>."""
    res = read(contract_id, "get_leaderboard", [scval.to_uint32(int(limit))])
    if not res["ok"]:
        return [{"error": res["error"]}]
    out = []
    for entry in res["value"] or []:
        # each entry is a 2-tuple (address, score)
        addr, score = entry[0], entry[1]
        out.append({"address": _addr_str(addr), "score": str(score)})
    return out


def get_agent_profile(contract_id: str, agent: str) -> dict:
    """get_agent(agent) -> Option<AgentProfile>."""
    res = read(contract_id, "get_agent", [scval.to_address(agent)])
    if not res["ok"]:
        return {"error": res["error"]}
    p = res["value"]
    if p is None:
        return {"registered": False, "agent": agent}
    return {
        "registered": True,
        "address": _addr_str(p.get("address")),
        "name": p.get("name"),
        "endpoint": p.get("endpoint"),
        "description": p.get("description"),
        "score": str(p.get("score")),
        "bounties_done": p.get("bounties_done"),
        "registered_at": p.get("registered_at"),
    }


def agent_count(contract_id: str) -> int:
    res = read(contract_id, "agent_count", [])
    return res["value"] if res["ok"] else 0


# -------------------------------------------------------------------------- writes


def register_agent(
    contract_id: str, agent: str, secret: str, name: str, endpoint: str, description: str
) -> dict:
    params = [
        scval.to_address(agent),
        scval.to_string(name),
        scval.to_string(endpoint),
        scval.to_string(description),
    ]
    res = invoke(contract_id, "register", params, secret)
    if not res["ok"]:
        return {"error": res["error"], "agent": agent}
    return {"status": "registered", "tx_hash": res["tx_hash"], "agent": agent}


def record_payment(contract_id: str, caller: str, secret: str, agent: str, amount: int) -> dict:
    """Admin-only: bump an agent's reputation. `secret` must be the admin's key."""
    params = [scval.to_address(caller), scval.to_address(agent), scval.to_int128(int(amount))]
    res = invoke(contract_id, "record_payment", params, secret)
    if not res["ok"]:
        return {"error": res["error"], "agent": agent}
    return {"status": "recorded", "tx_hash": res["tx_hash"], "agent": agent, "amount": str(amount)}
