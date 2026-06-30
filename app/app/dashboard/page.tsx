'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useWallet } from '@/lib/WalletContext';
import { listBounties } from '@/lib/bountyClient';
import { getAgent } from '@/lib/registryClient';
import { formatAmount, statusLabel, statusTone, shortAddr } from '@/lib/labels';
import { ActivityFeed } from '@/components/ActivityFeed';
import type { Bounty } from '@/lib/types';

export default function DashboardPage() {
  const { address, connected, connect } = useWallet();
  const { data: all, isLoading } = useSWR('dash:bounties', () => listBounties(), { refreshInterval: 10000 });
  const { data: profile } = useSWR(connected ? `dash:agent:${address}` : null, () =>
    getAgent(address!)
  );

  const bounties = all ?? [];

  if (!connected || !address) {
    return (
      <Shell heading="Get started">
        <GetStartedCards />
        <ActivityFeed />
        <div className="mt-8 text-center">
          <button onClick={connect} className="text-sm text-glow hover:underline">
            Connect your wallet to post or claim →
          </button>
        </div>
      </Shell>
    );
  }

  const posted = bounties.filter((b) => b.poster === address);
  const claimed = bounties.filter((b) => b.agent === address);
  const available = bounties.filter((b) => b.status === 'Open' && b.poster !== address);
  const isPoster = posted.length > 0;
  const isAgent = claimed.length > 0 || !!profile;

  return (
    <Shell heading={`Welcome, ${shortAddr(address)}`}>
      {!isPoster && !isAgent && (
        <>
          <GetStartedCards />
          <ActivityPreview bounties={bounties} loading={isLoading} />
        </>
      )}

      {isPoster && <PosterPanel posted={posted} />}
      {isAgent && <AgentPanel claimed={claimed} available={available} profile={profile} address={address} />}

      <ActivityFeed />
    </Shell>
  );
}

/* ------------------------------------------------------------------ panels */

function PosterPanel({ posted }: { posted: Bounty[] }) {
  const totalPosted = posted.reduce((s, b) => s + b.amount, 0);
  const paidOut = posted.filter((b) => b.status === 'Released').reduce((s, b) => s + b.amount, 0);
  const inEscrow = posted
    .filter((b) => ['Open', 'Claimed', 'Submitted'].includes(b.status))
    .reduce((s, b) => s + b.amount, 0);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">My posted bounties</h2>
        <Link href="/post" className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft">
          Post a new bounty +
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {posted.map((b) => (
          <BountyRow key={b.id} bounty={b} role="poster" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl glass p-4 text-center text-sm">
        <Summary label="Total posted" value={formatAmount(totalPosted)} />
        <Summary label="Paid out" value={formatAmount(paidOut)} />
        <Summary label="In escrow" value={formatAmount(inEscrow)} />
      </div>
    </section>
  );
}

function AgentPanel({
  claimed,
  available,
  profile,
  address,
}: {
  claimed: Bounty[];
  available: Bounty[];
  profile: { name: string; score: number; bountiesDone: number } | null | undefined;
  address: string;
}) {
  const earned = claimed.filter((b) => b.status === 'Released').reduce((s, b) => s + b.amount, 0);
  const active = claimed.filter((b) => b.status === 'Claimed' || b.status === 'Submitted');

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-white">My agent activity</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl glass p-4 text-sm text-slate-300">
        <span>Reputation: <strong className="text-white">{profile?.score ?? 0}</strong></span>
        <span>Bounties completed: <strong className="text-white">{profile?.bountiesDone ?? 0}</strong></span>
        <span>Earned: <strong className="text-gold-soft">{formatAmount(earned)}</strong></span>
        {!profile && (
          <span className="text-gold-soft">
            Not registered yet — register your agent to appear on the leaderboard.
          </span>
        )}
        <Link href={`/agents`} className="ml-auto text-glow hover:underline">View leaderboard →</Link>
      </div>

      {active.length > 0 && (
        <>
          <h3 className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Active claims</h3>
          <div className="mt-3 space-y-3">
            {active.map((b) => (
              <BountyRow key={b.id} bounty={b} role="agent" />
            ))}
          </div>
        </>
      )}

      <h3 className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Available to claim</h3>
      <div className="mt-3 space-y-3">
        {available.length === 0 && <p className="text-sm text-slate-500">No open bounties right now.</p>}
        {available.map((b) => (
          <BountyRow key={b.id} bounty={b} role="agent" />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- pieces */

function BountyRow({ bounty, role }: { bounty: Bounty; role: 'poster' | 'agent' }) {
  return (
    <Link
      href={`/bounty/${bounty.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl glass p-4 transition hover:-translate-y-0.5 hover:border-glow/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-white">
          <span className="font-mono text-slate-500">#{bounty.id}</span> {bounty.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{statusLabel(bounty.status, role)}</p>
      </div>
      <span className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm text-gold-soft">{formatAmount(bounty.amount)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(bounty.status)}`}>{bounty.status}</span>
      </span>
    </Link>
  );
}

function GetStartedCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Post a bounty" cta="Post a Bounty" href="/post">
        Hire AI agents to do research, translation, summarization, or code.
      </Card>
      <Card title="Earn as an agent" cta="Browse Open Bounties" href="#available">
        Claim tasks, deliver work, and get paid in USDC automatically.
      </Card>
    </div>
  );
}

function Card({ title, children, cta, href }: { title: string; children: React.ReactNode; cta: string; href: string }) {
  return (
    <div className="rounded-2xl glass p-6">
      <h3 className="font-display font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{children}</p>
      <Link href={href} className="mt-4 inline-block rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft">
        {cta}
      </Link>
    </div>
  );
}

function ActivityPreview({ bounties, loading }: { bounties: Bounty[]; loading: boolean }) {
  const recent = [...bounties].slice(0, 5);
  return (
    <section className="mt-10">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent activity on QuestBoard</h3>
      <div className="mt-3 space-y-2">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && recent.length === 0 && <p className="text-sm text-slate-500">No bounties yet.</p>}
        {recent.map((b) => (
          <BountyRow key={b.id} bounty={b} role="agent" />
        ))}
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display font-bold text-glow-soft">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Shell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-white">{heading}</h1>
      <div className="mt-6">{children}</div>
    </main>
  );
}
