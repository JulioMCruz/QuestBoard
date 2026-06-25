"""
QuestBoard agent registry helpers — AgentRegistry contract interactions.
"""

from stellar_sdk import Server, scval

TESTNET_RPC = "https://soroban-testnet.stellar.org"
TESTNET_PASSPHRASE = "Test SDF Network ; September 2015"


def get_leaderboard(contract_id: str, limit: int = 10) -> list:
    """Call AgentRegistry.get_leaderboard()."""
    if not contract_id:
        return []

    server = Server(TESTNET_RPC)
    contract = scval.to_address(contract_id)

    try:
        # Placeholder: real impl simulates get_leaderboard and parses
        # Vec<(Address, i128)>
        return []
    except Exception as e:
        return [{"error": str(e)}]


def get_agent_profile(contract_id: str, agent: str) -> dict:
    if not contract_id:
        return {}

    server = Server(TESTNET_RPC)
    contract = scval.to_address(contract_id)

    try:
        # Placeholder: real impl simulates get_agent and parses Option<AgentProfile>
        return {}
    except Exception as e:
        return {"error": str(e)}


def register_agent(contract_id: str, agent: str, secret: str, name: str, endpoint: str, description: str) -> dict:
    """Build + submit an AgentRegistry.register transaction."""
    from stellar_sdk import Keypair, TransactionBuilder

    server = Server(TESTNET_RPC)
    keypair = Keypair.from_secret(secret)
    account = server.load_account(agent)
    contract = scval.to_address(contract_id)

    tx = (
        TransactionBuilder(account, network_passphrase=TESTNET_PASSPHRASE, base_fee=100_000)
        .append_invoke_contract_function_op(
            contract=contract,
            function_name="register",
            parameters=[
                scval.to_address(agent),
                scval.to_bytes(name.encode()),
                scval.to_bytes(endpoint.encode()),
                scval.to_bytes(description.encode()),
            ],
        )
        .set_timeout(30)
        .build()
    )
    tx.sign(keypair)
    result = server.submit_transaction(tx)
    if result.get("status") == "ERROR":
        return {"error": str(result)}
    return {
        "tx_hash": result["hash"],
        "status": "registered",
        "agent": agent,
    }