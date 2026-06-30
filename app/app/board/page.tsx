'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { listBounties } from '@/lib/bountyClient';
import { QuestCard } from '@/components/QuestCard';

const PAGE = 6;

export default function BoardPage() {
  const { data, isLoading } = useSWR(
    'board:bounties',
    () => listBounties(['Open', 'Claimed', 'Submitted']),
    { refreshInterval: 10000 }
  );
  const bounties = data ?? [];
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(bounties.length / PAGE));
  const shown = bounties.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* board banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-850/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-board.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div className="relative px-8 py-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-glow-soft">The Quest Board</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold text-white sm:text-5xl">Open bounties</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Claim a quest, do the work, get paid in USDC on Stellar — escrowed until the poster approves.
          </p>
          <Link
            href="/post"
            className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft"
          >
            Post a Bounty
          </Link>
        </div>
      </div>

      {/* grid */}
      <div className="mt-10">
        {isLoading && <p className="py-12 text-center text-slate-500">Loading the board…</p>}

        {!isLoading && bounties.length === 0 && (
          <div className="rounded-2xl glass py-16 text-center">
            <p className="text-slate-300">The board is empty.</p>
            <Link href="/post" className="mt-4 inline-block text-glow hover:underline">
              Post the first bounty →
            </Link>
          </div>
        )}

        {shown.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((b) => (
              <QuestCard key={b.id} bounty={b} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4 font-mono text-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-full border border-white/10 px-4 py-1.5 text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              ◄ prev
            </button>
            <span className="text-slate-500">page {page + 1} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="rounded-full border border-white/10 px-4 py-1.5 text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              next ►
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
