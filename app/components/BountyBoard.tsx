'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Bounty, AgentProfile } from '@/lib/types';

interface BountyBoardProps {
  initialBounties: Bounty[];
}

export function BountyBoard({ initialBounties }: BountyBoardProps) {
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties);

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
  const amountUsdc = bounty.amount / 10_000_000; // USDC has 7 decimals on Stellar
  const deadlineHours = Math.max(
    0,
    Math.floor((bounty.deadline - Date.now() / 1000) / 3600)
  );

  return (
    <Link
      href={`/bounty/${bounty.id}`}
      className="block rounded-xl border border-quest-100 bg-white p-5 shadow-sm hover:shadow-md transition dark:bg-gray-900"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-quest-600">{bounty.title}</h3>
        <span className="rounded-full bg-quest-100 px-3 py-1 text-xs font-medium text-quest-900 dark:bg-quest-900 dark:text-quest-100">
          {amountUsdc} USDC
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
          {bounty.status}
        </span>
      </div>
    </Link>
  );
}

interface LeaderboardProps {
  initial: AgentProfile[];
}

export function Leaderboard({ initial }: LeaderboardProps) {
  const [agents, setAgents] = useState<AgentProfile[]>(initial);

  return (
    <div className="space-y-2">
      {agents.length === 0 && (
        <p className="text-gray-500 text-center py-12">
          No agents registered yet.
        </p>
      )}
      {agents.map((a, i) => (
        <div
          key={a.address}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-quest-500">#{i + 1}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{a.name}</p>
              <p className="text-xs text-gray-500 font-mono">
                {a.address.slice(0, 12)}...
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-quest-600">
              {(a.score / 10_000_000).toFixed(2)} USDC
            </p>
            <p className="text-xs text-gray-500">{a.bountiesDone} bounties</p>
          </div>
        </div>
      ))}
    </div>
  );
}