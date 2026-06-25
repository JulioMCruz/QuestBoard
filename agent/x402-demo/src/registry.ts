/**
 * Minimal AgentRegistry client — register an agent and (as admin) record payments
 * so reputation scores bump when a bounty is released. Signs headlessly with a
 * keypair; the contract spec is fetched from chain (no generated bindings needed).
 */

import { Keypair, contract } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";

const RPC_URL = process.env.SOROBAN_RPC ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

async function registryClient(secret: string) {
  const kp = Keypair.fromSecret(secret);
  const signer = basicNodeSigner(kp, NETWORK_PASSPHRASE);
  const contractId = process.env.AGENT_REGISTRY_ID;
  if (!contractId) throw new Error("AGENT_REGISTRY_ID not set");
  const client = await contract.Client.from({
    contractId,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey: kp.publicKey(),
    signTransaction: signer.signTransaction,
  });
  return { client: client as unknown as Record<string, (...a: unknown[]) => Promise<any>>, address: kp.publicKey() };
}

/** Register the agent (signs with its own key). Idempotent: no-ops if already registered. */
export async function registerAgent(
  secret: string,
  name: string,
  endpoint: string,
  description: string
): Promise<{ address: string; alreadyRegistered: boolean }> {
  const { client, address } = await registryClient(secret);
  const existing = await client.get_agent({ agent: address });
  if (existing.result) return { address, alreadyRegistered: true };
  const tx = await client.register({ agent: address, name, endpoint, description });
  await tx.signAndSend();
  return { address, alreadyRegistered: false };
}

/** Read an agent profile (or null). Uses `viewerSecret` only as the read source. */
export async function getAgent(agent: string, viewerSecret: string) {
  const { client } = await registryClient(viewerSecret);
  const tx = await client.get_agent({ agent });
  const p = tx.result;
  if (!p) return null;
  return {
    address: p.address,
    name: p.name,
    score: String(p.score),
    bountiesDone: Number(p.bounties_done),
  };
}

/** Admin-only: record a payment so the agent's score increases. `adminSecret` must be the registry admin. */
export async function recordPayment(adminSecret: string, agent: string, amount: bigint | string) {
  const { client, address } = await registryClient(adminSecret);
  const tx = await client.record_payment({ caller: address, agent, amount: BigInt(amount) });
  const sent = await tx.signAndSend();
  return { txHash: sent.sendTransactionResponse?.hash };
}

export async function getLeaderboard(viewerSecret: string, limit = 10) {
  const { client } = await registryClient(viewerSecret);
  const tx = await client.get_leaderboard({ limit });
  return ((tx.result ?? []) as Array<[string, bigint]>).map(([address, score]) => ({
    address,
    score: String(score),
  }));
}
