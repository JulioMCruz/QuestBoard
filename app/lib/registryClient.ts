/**
 * QuestBoard AgentRegistry client using generated TypeScript bindings.
 * Reference: Stellar-mcp stellar_nextjs_wallet_scaffold
 */

import { Contract as RegistryContract, networks } from "@/packages/registry-bindings";

const AGENT_REGISTRY_ID = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID || "";

export function getAgentRegistryContract() {
  if (!AGENT_REGISTRY_ID) {
    throw new Error("NEXT_PUBLIC_AGENT_REGISTRY_ID not set");
  }
  return new RegistryContract({
    contractId: AGENT_REGISTRY_ID,
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC || "https://soroban-testnet.stellar.org",
  });
}

export async function getLeaderboard(limit: number = 10): Promise<any[]> {
  const contract = getAgentRegistryContract();
  // In production: call contract.get_leaderboard(limit)
  // For MVP: return placeholder data
  return [];
}