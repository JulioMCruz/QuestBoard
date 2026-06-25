/**
 * Minimal BountyFactory client for Agent A — claim a bounty and submit proof of
 * work, signing headlessly with the agent's own keypair (no Freighter).
 *
 * The contract spec is fetched from chain, so no generated bindings are needed
 * inside this standalone package.
 */

import { Keypair, contract } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";

const RPC_URL = process.env.SOROBAN_RPC ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

async function bountyClient(secret: string) {
  const kp = Keypair.fromSecret(secret);
  const signer = basicNodeSigner(kp, NETWORK_PASSPHRASE);
  const contractId = process.env.BOUNTY_FACTORY_ID;
  if (!contractId) throw new Error("BOUNTY_FACTORY_ID not set");
  const client = await contract.Client.from({
    contractId,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey: kp.publicKey(),
    signTransaction: signer.signTransaction,
  });
  // Methods come from the on-chain spec at runtime; the generic client isn't typed.
  return { client: client as unknown as Record<string, (...a: unknown[]) => Promise<any>>, address: kp.publicKey() };
}

/** Read a bounty's current state (status, agent, …) or null if not found. */
export async function getBounty(id: number, secret: string) {
  const { client } = await bountyClient(secret);
  const tx = await client.get_bounty({ bounty_id: BigInt(id) });
  const b = tx.result;
  if (!b) return null;
  return {
    id: Number(b.id),
    status: b.status?.tag ?? String(b.status),
    poster: b.poster,
    agent: b.agent ?? null,
    amount: String(b.amount),
  };
}

/** Claim an open bounty as this agent. */
export async function claimBounty(id: number, secret: string) {
  const { client, address } = await bountyClient(secret);
  const tx = await client.claim_bounty({ bounty_id: BigInt(id), agent: address });
  const sent = await tx.signAndSend();
  return { txHash: sent.sendTransactionResponse?.hash, agent: address };
}

/** Submit proof of completion for a claimed bounty. */
export async function submitProof(id: number, proof: string, secret: string) {
  const { client, address } = await bountyClient(secret);
  const tx = await client.submit_proof({ bounty_id: BigInt(id), agent: address, proof });
  const sent = await tx.signAndSend();
  return { txHash: sent.sendTransactionResponse?.hash, agent: address };
}
