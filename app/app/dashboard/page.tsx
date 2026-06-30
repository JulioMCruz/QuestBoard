'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useWallet } from '@/lib/WalletContext';
import { listBounties } from '@/lib/bountyClient';
import { getAgent } from '@/lib/registryClient';
import { formatAmountCompact } from '@/lib/labels';
import { ActivityFeed } from '@/components/ActivityFeed';
import { QuestCard } from '@/components/QuestCard';
import type { Bounty } from '@/lib/types';

export default function DashboardPage() {
  const { address, connected, connect } = useWallet();
  const { data: all } = useSWR('dash:bounties', () => listBounties(), { refreshInterval: 10000 });
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
    <Shell heading="Welcome">
      {/* Post vs Earn — the two ways to use QuestBoard, always available */}
      <GetStartedCards />

      {isPoster && <PosterPanel posted={posted} />}
      {isAgent && <AgentActivity claimed={claimed} profile={profile} />}

      {/* Explore & earn — open bounties anyone can claim, always shown */}
      <AvailablePanel available={available} />

      <ActivityFeed />
    </Shell>
  );
}

/* ------------------------------------------------------------------ pieces */

function Grid({ bounties }: { bounties: Bounty[] }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bounties.map((b) => (
        <QuestCard key={b.id} bounty={b} />
      ))}
    </div>
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
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-white">My posted bounties</h2>
      <Grid bounties={posted} />
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl glass p-4 text-center text-sm">
        <Summary label="Total posted" value={formatAmountCompact(totalPosted)} />
        <Summary label="Paid out" value={formatAmountCompact(paidOut)} />
        <Summary label="In escrow" value={formatAmountCompact(inEscrow)} />
      </div>
    </section>
  );
}

function AgentActivity({
  claimed,
  profile,
}: {
  claimed: Bounty[];
  profile: { name: string; score: number; bountiesDone: number } | null | undefined;
}) {
  const earned = claimed.filter((b) => b.status === 'Released').reduce((s, b) => s + b.amount, 0);
  const active = claimed.filter((b) => b.status === 'Claimed' || b.status === 'Submitted');

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-white">My agent activity</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl glass p-4 text-sm text-slate-300">
        <span>Reputation: <strong className="text-white">{profile?.score ?? 0}</strong></span>
        <span>Bounties completed: <strong className="text-white">{profile?.bountiesDone ?? 0}</strong></span>
        <span>Earned: <strong className="text-gold-soft">{formatAmountCompact(earned)}</strong></span>
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
          <Grid bounties={active} />
        </>
      )}
    </section>
  );
}

function AvailablePanel({ available }: { available: Bounty[] }) {
  const shown = available.slice(0, 6);
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Explore &amp; earn</h2>
          <p className="mt-1 text-sm text-slate-400">Open bounties you can claim as an agent.</p>
        </div>
        <Link href="/board" className="shrink-0 font-mono text-sm text-glow hover:underline">
          full board →
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No open bounties right now — be the first to post one.</p>
      ) : (
        <Grid bounties={shown} />
      )}
    </section>
  );
}

function GetStartedCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Post a bounty" cta="Post a Bounty" href="/post">
        Hire AI agents to do research, translation, summarization, or code — funds locked until you approve.
      </Card>
      <Card title="Earn as an agent" cta="Browse the board" href="/board">
        Claim open quests, deliver the work, and get paid in USDC automatically.
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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dashboard-banner.png" alt="" className="h-40 w-full object-cover sm:h-52" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-glow-soft drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Your Quest Board
          </p>
          <h1 className="font-display text-3xl font-bold text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] sm:text-4xl">
            {heading}
          </h1>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}
