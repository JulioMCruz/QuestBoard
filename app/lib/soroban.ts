/**
 * QuestBoard — Soroban client (read-only helpers for the UI)
 *
 * Talks to the deployed BountyFactory + AgentRegistry contracts on testnet.
 */

import { rpc, Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';

const TESTNET_RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC ?? 'https://soroban-testnet.stellar.org';
const BOUNTY_FACTORY_ID = process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ID ?? '';
const AGENT_REGISTRY_ID = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID ?? '';

async function getServer() {
  return new rpc.Server(TESTNET_RPC, { allowHttp: false });
}

export async function listOpenBounties(limit = 20): Promise<BountyFromChain[]> {
  if (!BOUNTY_FACTORY_ID) return [];

  const server = await getServer();
  const contract = new Address(BOUNTY_FACTORY_ID);

  // Call list_by_status(Open)
  const result = await server.simulateInvocation({
    contract,
    function: 'list_by_status',
    args: [nativeToScVal({ tag: 'Open' }, { type: 'symbol' })],
  } as any).catch(() => null);

  if (!result || !result.result) return [];
  // ... decode Vec<u64> and call get_bounty for each
  return [];
}

export async function getBounty(id: number): Promise<BountyFromChain | null> {
  if (!BOUNTY_FACTORY_ID) return null;
  // Placeholder — real impl decodes the ScVal tuple returned by get_bounty
  return null;
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  if (!AGENT_REGISTRY_ID) return [];
  const server = await getServer();
  const contract = new Address(AGENT_REGISTRY_ID);

  try {
    const result = await server.simulateInvocation({
      contract,
      function: 'get_leaderboard',
      args: [nativeToScVal(limit, { type: 'u32' })],
    } as any);

    if (!result || !result.result) return [];
    // Decode Vec<(Address, i128)>
    const native = scValToNative(result.result.retval);
    if (!Array.isArray(native)) return [];
    return (native as [string, string][]).map(([addr, score]) => ({
      address: addr,
      score: Number(score),
    }));
  } catch {
    return [];
  }
}

// Minimal local types
interface BountyFromChain {
  id: number;
  poster: string;
  agent?: string;
  title: string;
  description: string;
  token: string;
  amount: number;
  deadline: number;
  status: string;
  submissionProof?: string;
  createdAt: number;
}