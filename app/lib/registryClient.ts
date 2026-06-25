/**
 * QuestBoard AgentRegistry client — real on-chain reads + writes via the
 * generated bindings.
 */

import type { AgentProfile as ChainAgentProfile } from "@/lib/bindings/registryBindings";
import { registryReadClient, registryWriteClient } from "./contractClients";
import type { AgentProfile } from "./types";

function toUiAgent(p: ChainAgentProfile): AgentProfile {
  return {
    address: p.address,
    name: p.name,
    endpoint: p.endpoint,
    description: p.description,
    score: Number(p.score),
    bountiesDone: Number(p.bounties_done),
    registeredAt: Number(p.registered_at),
  };
}

// ----------------------------------------------------------------------- reads

export async function getAgent(address: string, source?: string): Promise<AgentProfile | null> {
  const client = registryReadClient(source);
  const tx = await client.get_agent({ agent: address });
  return tx.result ? toUiAgent(tx.result) : null;
}

/**
 * Top-N agents by score. The contract returns (address, score) pairs; we enrich
 * each with its full profile so the UI can show names + bounty counts.
 */
export async function getLeaderboard(limit = 10, source?: string): Promise<AgentProfile[]> {
  const client = registryReadClient(source);
  const tx = await client.get_leaderboard({ limit });
  const pairs = tx.result ?? [];

  const agents = await Promise.all(
    pairs.map(async ([address, score]) => {
      const profile = await client.get_agent({ agent: address });
      if (profile.result) return toUiAgent(profile.result);
      return {
        address,
        name: `${address.slice(0, 6)}…${address.slice(-4)}`,
        endpoint: "",
        description: "",
        score: Number(score),
        bountiesDone: 0,
        registeredAt: 0,
      } as AgentProfile;
    })
  );
  return agents;
}

// ---------------------------------------------------------------------- writes

export interface RegisterAgentInput {
  name: string;
  endpoint: string;
  description: string;
}

export async function registerAgent(address: string, input: RegisterAgentInput): Promise<void> {
  const client = registryWriteClient(address);
  const tx = await client.register({
    agent: address,
    name: input.name,
    endpoint: input.endpoint,
    description: input.description,
  });
  await tx.signAndSend();
}
