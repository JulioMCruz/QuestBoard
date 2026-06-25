/**
 * QuestBoard BountyFactory client — real on-chain reads + writes via the
 * generated bindings. Reads simulate; writes sign with Freighter and submit.
 */

import type { Bounty as ChainBounty, BountyStatus } from "@/lib/bindings/bountyBindings";
import { bountyReadClient, bountyWriteClient, TOKEN_ID } from "./contractClients";
import type { Bounty } from "./types";

const TOKEN_DECIMALS = 7;
const ALL_STATUSES: BountyStatus["tag"][] = [
  "Open",
  "Claimed",
  "Submitted",
  "Released",
  "Refunded",
];

export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS));
}

function toUiBounty(b: ChainBounty): Bounty {
  return {
    id: Number(b.id),
    poster: b.poster,
    agent: b.agent ?? undefined,
    title: b.title,
    description: b.description,
    token: b.token,
    amount: Number(b.amount),
    deadline: Number(b.deadline),
    status: b.status.tag,
    submissionProof: b.submission_proof ?? undefined,
    createdAt: Number(b.created_at),
  };
}

// ----------------------------------------------------------------------- reads

/** List bounties for the given statuses (default: all), newest id first. */
export async function listBounties(
  statuses: BountyStatus["tag"][] = ALL_STATUSES,
  source?: string
): Promise<Bounty[]> {
  const client = bountyReadClient(source);

  const ids: bigint[] = [];
  for (const tag of statuses) {
    const tx = await client.list_by_status({ status: { tag, values: undefined } as BountyStatus });
    for (const id of tx.result ?? []) ids.push(id);
  }

  const unique = Array.from(new Set(ids.map((i) => i.toString()))).map((s) => BigInt(s));
  const bounties = await Promise.all(
    unique.map(async (id) => {
      const tx = await client.get_bounty({ bounty_id: id });
      return tx.result ? toUiBounty(tx.result) : null;
    })
  );
  return bounties.filter((b): b is Bounty => b !== null).sort((a, b) => b.id - a.id);
}

export async function getBountyById(id: number, source?: string): Promise<Bounty | null> {
  const client = bountyReadClient(source);
  const tx = await client.get_bounty({ bounty_id: BigInt(id) });
  return tx.result ? toUiBounty(tx.result) : null;
}

// ---------------------------------------------------------------------- writes

export interface CreateBountyInput {
  title: string;
  description: string;
  amount: number; // human units (e.g. 12.5)
  deadlineHours: number;
  token?: string;
}

/** Create a bounty, locking `amount` of the token in escrow. Returns the new id. */
export async function createBounty(address: string, input: CreateBountyInput): Promise<number> {
  const client = bountyWriteClient(address);
  const tx = await client.create_bounty({
    poster: address,
    title: input.title,
    description: input.description,
    amount: toBaseUnits(input.amount),
    token: input.token ?? TOKEN_ID,
    deadline_hours: input.deadlineHours,
  });
  const sent = await tx.signAndSend();
  return Number(sent.result);
}

export async function claimBounty(address: string, id: number): Promise<void> {
  const client = bountyWriteClient(address);
  const tx = await client.claim_bounty({ bounty_id: BigInt(id), agent: address });
  await tx.signAndSend();
}

export async function submitProof(address: string, id: number, proof: string): Promise<void> {
  const client = bountyWriteClient(address);
  const tx = await client.submit_proof({ bounty_id: BigInt(id), agent: address, proof });
  await tx.signAndSend();
}

export async function releasePayment(address: string, id: number): Promise<void> {
  const client = bountyWriteClient(address);
  const tx = await client.release_payment({ bounty_id: BigInt(id) });
  await tx.signAndSend();
}

export async function refundBounty(address: string, id: number): Promise<void> {
  const client = bountyWriteClient(address);
  const tx = await client.refund({ bounty_id: BigInt(id) });
  await tx.signAndSend();
}
