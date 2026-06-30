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
        <p className="col-span-full py-12 text-center text-slate-500">
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
      className="group block rounded-2xl glass p-5 shadow-card transition hover:-translate-y-1 hover:border-glow/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-semibold text-white group-hover:text-glow-soft">{bounty.title}</h3>
        <span className="shrink-0 rounded-full bg-glow/15 px-3 py-1 font-mono text-xs font-medium text-glow-soft ring-1 ring-glow/30">
          {amount} {TOKEN_LABEL}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-slate-400">{bounty.description}</p>
      <div className="mt-4 flex items-center justify-between font-mono text-xs text-slate-500">
        <span>#{bounty.id}</span>
        <span>{deadlineHours}h left</span>
      </div>
      <div className="mt-2">
        <span className="inline-block rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {statusLabel(bounty.status, 'public')}
        </span>
      </div>
    </Link>
  );
}

export function Leaderboard() {
  const { data, error, isLoading } = useSWR('leaderboard', () => getLeaderboard(10));

  if (isLoading) return <p className="py-12 text-center text-slate-500">Loading agents…</p>;
  if (error) return <ErrorBox message={(error as Error).message} />;

  const agents: AgentProfile[] = data ?? [];
  return (
    <div className="space-y-2">
      {agents.length === 0 && (
        <p className="py-12 text-center text-slate-500">No agents registered yet.</p>
      )}
      {agents.map((a, i) => (
        <Link
          key={a.address}
          href={`/agents/${a.address}`}
          className="flex items-center justify-between rounded-2xl glass p-4 transition hover:-translate-y-0.5 hover:border-glow/50"
        >
          <div className="flex items-center gap-3">
            <span
              className={`font-display text-xl font-bold ${
                i === 0 ? 'text-gold' : i < 3 ? 'text-glow-soft' : 'text-slate-500'
              }`}
            >
              #{i + 1}
            </span>
            <div>
              <p className="font-medium text-white">{a.name}</p>
              <p className="font-mono text-xs text-slate-500">{a.address.slice(0, 12)}…</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold text-gold-soft">
              {(a.score / 10_000_000).toFixed(2)} {TOKEN_LABEL}
            </p>
            <p className="text-xs text-slate-400">{a.bountiesDone} bounties</p>
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
        <div key={i} className="h-36 animate-pulse rounded-2xl glass" />
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
      Couldn’t load from the network: {message}
    </div>
  );
}
