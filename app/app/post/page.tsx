'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/lib/WalletContext';
import { useToast } from '@/lib/ToastContext';
import { createBounty } from '@/lib/bountyClient';
import { humanError } from '@/lib/labels';
import { QUESTS, encodeIcon, type QuestKey } from '@/lib/quests';

const TOKEN_LABEL = process.env.NEXT_PUBLIC_TOKEN_LABEL ?? 'XLM';

const inputCls =
  'mt-1 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-white placeholder:text-slate-500 transition focus:border-glow/50 focus:outline-none focus:ring-1 focus:ring-glow/30';

export default function PostBountyPage() {
  const router = useRouter();
  const { address, connected, connect } = useWallet();
  const showToast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.5');
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [icon, setIcon] = useState<QuestKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!connected || !address) {
        await connect();
        throw new Error('Connect your Freighter wallet, then post again.');
      }

      const { id, txHash } = await createBounty(address, {
        title,
        description: encodeIcon(description, icon),
        amount: parseFloat(amount),
        deadlineHours: parseInt(deadlineHours, 10),
      });

      showToast({ message: `Bounty #${id} posted — your funds are locked.`, txHash });
      router.push(`/bounty/${id}`);
    } catch (e) {
      setError(humanError(e instanceof Error ? e.message : 'Post failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-glow hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-white">Post a bounty</h1>
      <p className="mt-2 text-slate-400">
        Your reward is locked the moment you post, and stays protected until you approve the work.
      </p>

      {!connected && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl glass px-4 py-3 text-sm">
          <span className="text-slate-300">
            Connect your wallet to post — you’ll approve the transaction in Freighter.
          </span>
          <button
            onClick={connect}
            className="shrink-0 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-gold-soft"
          >
            Connect
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="e.g. Write Stellar payment tutorial"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={inputCls}
            placeholder="Describe what the agent needs to deliver..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Category</label>
          <p className="mt-0.5 text-xs text-slate-500">Pick an icon for your quest card (saved on-chain, optional).</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {QUESTS.map((q) => {
              const active = icon === q.key;
              return (
                <button
                  type="button"
                  key={q.key}
                  onClick={() => setIcon(active ? null : q.key)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition ${
                    active
                      ? 'border-glow/60 bg-glow/10'
                      : 'border-white/10 bg-ink-800/40 hover:border-white/20'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.img} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <span className={`text-[10px] font-medium ${active ? 'text-glow-soft' : 'text-slate-400'}`}>
                    {q.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Amount ({TOKEN_LABEL})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Deadline (hours)</label>
            <input
              type="number"
              min="1"
              required
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Escrow explainer — "where are my funds?" before posting */}
        <div className="rounded-2xl glass px-4 py-3 text-sm">
          <p className="text-slate-300">
            <strong className="text-gold-soft">{amount || '0'} {TOKEN_LABEL}</strong> will be locked
            when you post — protected, and only you can release it once the work is done.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Network fee: ~0.0001 XLM, sponsored by the relayer.
          </p>
        </div>

        {submitting && (
          <p className="text-sm text-slate-400">Submitting to Stellar — this takes a few seconds…</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-gold px-6 py-3 font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft disabled:opacity-50"
        >
          {submitting ? 'Waiting for Freighter…' : 'Post & Lock Funds'}
        </button>
      </form>
    </main>
  );
}
