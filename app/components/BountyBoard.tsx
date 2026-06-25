'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { Bounty, AgentProfile } from '@/lib/types';
import { listBounties } from '@/lib/bountyClient';
import { getLeaderboard } from '@/lib/registryClient';
import { statusLabel } from '@/lib/labels';

const TOKEN_LABEL = process.env.NEXT_PUBLIC_TOKEN_LABEL ?? 'XLM';

export function BountyBoard() {
  // Active bounties: anything not yet finalized.
  const { data, error, isLoading } = useSWR('bounties:active', () =>
    listBounties(['Open', 'Claimed', 'Submitted'])
  );

  if (isLoading) return <SkeletonGrid />;
  if (error) return <ErrorBox message={(error as Error).message} />;

  const bounties = data ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bounties.length === 0 && (
        <p className="text-gray-500 col-span-full text-center py-12">
          No bounties yet. Be the first to post one.
        </p>
      )}
      {bounties.map((b) => (
        <BountyCard key={b.id} bounty={b} />
      ))}
    </div>
  );
}

function BountyCard({ bounty }: { bounty: Bounty }) {
  const amount = bounty.amount / 10_000_000; // 7 decimals on Stellar
  const deadlineHours = Math.max(
    0,
    Math.floor((bounty.deadline - Date.now() / 1000) / 3600)
  );

  return (
    <Link
      href={`/bounty/${bounty.id}`}
      className="block rounded-xl border border-quest-100 bg-white p-5 shadow-sm hover:shadow-md transition dark:bg-gray-900"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-quest-600">{bounty.title}</h3>
        <span className="shrink-0 rounded-full bg-quest-100 px-3 py-1 text-xs font-medium text-quest-900 dark:bg-quest-900 dark:text-quest-100">
          {amount} {TOKEN_LABEL}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
        {bounty.description}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>#{bounty.id}</span>
        <span>{deadlineHours}h left</span>
      </div>
      <div className="mt-2">
        <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {statusLabel(bounty.status, 'public')}
        </span>
      </div>
    </Link>
  );
}

export function Leaderboard() {
  const { data, error, isLoading } = useSWR('leaderboard', () => getLeaderboard(10));

  if (isLoading) return <p className="text-gray-500 text-center py-12">Loading agents…</p>;
  if (error) return <ErrorBox message={(error as Error).message} />;

  const agents: AgentProfile[] = data ?? [];
  return (
    <div className="space-y-2">
      {agents.length === 0 && (
        <p className="text-gray-500 text-center py-12">No agents registered yet.</p>
      )}
      {agents.map((a, i) => (
        <Link
          key={a.address}
          href={`/agents/${a.address}`}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-quest-500">#{i + 1}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{a.name}</p>
              <p className="text-xs text-gray-500 font-mono">{a.address.slice(0, 12)}…</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-quest-600">
              {(a.score / 10_000_000).toFixed(2)} {TOKEN_LABEL}
            </p>
            <p className="text-xs text-gray-500">{a.bountiesDone} bounties</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-xl border border-quest-100 bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      Couldn’t load from the network: {message}
    </div>
  );
}
