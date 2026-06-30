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
    proof: (b.submission_proof ?? null) as string | null,
  };
}

/** List bounty ids in a given status (Open | Claimed | Submitted | Released | Refunded). */
export async function listByStatus(status: string, secret: string): Promise<number[]> {
  const { client } = await bountyClient(secret);
  const tx = await client.list_by_status({ status: { tag: status, values: undefined } });
  return ((tx.result ?? []) as bigint[]).map((n) => Number(n));
}

/** Release escrow to the agent. Signs as the poster (`secret` must be the poster's). */
export async function releasePayment(id: number, secret: string) {
  const { client } = await bountyClient(secret);
  const tx = await client.release_payment({ bounty_id: BigInt(id) });
  const sent = await tx.signAndSend();
  return { txHash: sent.sendTransactionResponse?.hash };
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

/** Create (post) a bounty, locking `amount` base units of `token` in escrow. Signs as poster. */
export async function createBounty(
  input: { title: string; description: string; amount: bigint; token: string; deadlineHours: number },
  secret: string
) {
  const { client, address } = await bountyClient(secret);
  const tx = await client.create_bounty({
    poster: address,
    title: input.title,
    description: input.description,
    amount: input.amount,
    token: input.token,
    deadline_hours: input.deadlineHours,
  });
  const sent = await tx.signAndSend();
  return { id: Number(sent.result), txHash: sent.sendTransactionResponse?.hash, poster: address };
}
