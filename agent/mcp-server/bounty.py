"""
QuestBoard bounty helpers — BountyFactory contract interactions.
"""

from stellar_sdk import (
    Server,
    Keypair,
    TransactionBuilder,
    Network,
    scval,
    Address,
)

TESTNET_RPC = "https://soroban-testnet.stellar.org"
TESTNET_PASSPHRASE = "Test SDF Network ; September 2015"
USDC_TESTNET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3UDAMQA"


def _build_contract_op(contract_id: str, fn: str, params: list):
    """Build an invokeContractFunction operation."""
    return TransactionBuilder(
        address=Address(contract_id),
    ).append_invoke_contract_function_op(
        contract=scval.to_address(contract_id),
        function_name=fn,
        parameters=params,
    ).build()


def list_open_bounties(contract_id: str, status_filter: str, limit: int) -> list:
    """Call BountyFactory.list_by_status() via Soroban RPC simulate."""
    if not contract_id:
        return []

    server = Server(TESTNET_RPC)
    try:
        # Placeholder: real impl uses sorobanClient.simulateTransaction
        # with list_by_status(Open) and then get_bounty for each ID
        return []
    except Exception as e:
        return [{"error": str(e)}]


def create_bounty(contract_id: str, source: str, secret: str, title: str, description: str, amount: float, deadline_hours: int) -> dict:
    """Build + submit a BountyFactory.create_bounty transaction."""
    if not contract_id:
        return {"error": "BOUNTY_FACTORY_ID not set"}

    server = Server(TESTNET_RPC)
    keypair = Keypair.from_secret(secret)
    account = server.load_account(source)
    contract = scval.to_address(contract_id)

    # amount_usdc * 10_000_000 (USDC 7 decimals)
    amount_i128 = int(amount * 10_000_000)
    deadline_ts = int(deadline_hours * 3600)

    tx = (
        TransactionBuilder(account, network_passphrase=TESTNET_PASSPHRASE, base_fee=100_000)
        .append_invoke_contract_function_op(
            contract=contract,
            function_name="create_bounty",
            parameters=[
                scval.to_address(source),
                scval.to_bytes(title.encode()),
                scval.to_bytes(description.encode()),
                scval.to_address(USDC_TESTNET),
                scval.to_int128(amount_i128),
                scval.to_u64(deadline_ts),
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
        "status": "created",
        "bounty_id": "TODO_parse_from_events",
    }


def claim_bounty(contract_id: str, bounty_id: int, agent: str, secret: str, endpoint: str) -> dict:
    if not contract_id:
        return {"error": "BOUNTY_FACTORY_ID not set"}

    server = Server(TESTNET_RPC)
    keypair = Keypair.from_secret(secret)
    account = server.load_account(agent)
    contract = scval.to_address(contract_id)

    tx = (
        TransactionBuilder(account, network_passphrase=TESTNET_PASSPHRASE, base_fee=100_000)
        .append_invoke_contract_function_op(
            contract=contract,
            function_name="claim_bounty",
            parameters=[
                scval.to_u64(bounty_id),
                scval.to_address(agent),
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
        "status": "claimed",
        "bounty_id": bounty_id,
    }


def submit_proof(contract_id: str, bounty_id: int, agent: str, secret: str, proof_hash: str, ipfs: str) -> dict:
    if not contract_id:
        return {"error": "BOUNTY_FACTORY_ID not set"}

    server = Server(TESTNET_RPC)
    keypair = Keypair.from_secret(secret)
    account = server.load_account(agent)
    contract = scval.to_address(contract_id)

    proof_bytes = proof_hash.encode()
    ipfs_bytes = ipfs.encode() if ipfs else b""

    tx = (
        TransactionBuilder(account, network_passphrase=TESTNET_PASSPHRASE, base_fee=100_000)
        .append_invoke_contract_function_op(
            contract=contract,
            function_name="submit_proof",
            parameters=[
                scval.to_u64(bounty_id),
                scval.to_address(agent),
                scval.to_bytes(proof_bytes),
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
        "status": "submitted",
        "bounty_id": bounty_id,
    }


def release_payment(contract_id: str, bounty_id: int, caller: str, secret: str) -> dict:
    if not contract_id:
        return {"error": "BOUNTY_FACTORY_ID not set"}

    server = Server(TESTNET_RPC)
    keypair = Keypair.from_secret(secret)
    account = server.load_account(caller)
    contract = scval.to_address(contract_id)

    tx = (
        TransactionBuilder(account, network_passphrase=TESTNET_PASSPHRASE, base_fee=100_000)
        .append_invoke_contract_function_op(
            contract=contract,
            function_name="release_payment",
            parameters=[
                scval.to_u64(bounty_id),
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
        "status": "released",
        "bounty_id": bounty_id,
    }


def get_bounty_status(contract_id: str, bounty_id: int) -> dict:
    """Call get_bounty() to check status."""
    if not contract_id:
        return {"status": "unknown", "error": "BOUNTY_FACTORY_ID not set"}

    server = Server(TESTNET_RPC)
    contract = scval.to_address(contract_id)

    try:
        # Placeholder: real impl simulates get_bounty and parses the tuple
        return {"status": "unknown", "note": "MVP placeholder"}
    except Exception as e:
        return {"status": "error", "error": str(e)}