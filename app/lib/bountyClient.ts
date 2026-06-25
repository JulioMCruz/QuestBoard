/**
 * QuestBoard BountyFactory client using generated TypeScript bindings.
 * Reference: Stellar-mcp stellar_nextjs_wallet_scaffold
 */

import { Contract as BountyContract, networks } from "@/packages/bounty-bindings";

const BOUNTY_FACTORY_ID = process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ID || "";

export function getBountyFactoryContract() {
  if (!BOUNTY_FACTORY_ID) {
    throw new Error("NEXT_PUBLIC_BOUNTY_FACTORY_ID not set");
  }
  return new BountyContract({
    contractId: BOUNTY_FACTORY_ID,
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC || "https://soroban-testnet.stellar.org",
  });
}

export async function createBounty(
  poster: string,
  title: string,
  description: string,
  token: string,
  amount: number,
  deadline: number
): Promise<number> {
  const contract = getBountyFactoryContract();
  // In production: call contract.create_bounty()
  // For MVP: return placeholder ID
  return 42;
}