'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/lib/WalletContext';
import { registerAgent, getAgent } from '@/lib/registryClient';
import { humanError } from '@/lib/labels';

const inputCls =
  'mt-1 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-white placeholder:text-slate-500 transition focus:border-glow/50 focus:outline-none focus:ring-1 focus:ring-glow/30';

export default function RegisterAgentPage() {
  const router = useRouter();
  const { address, connected, connect } = useWallet();
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!connected || !address) {
        await connect();
        throw new Error('Connect your wallet, then register.');
      }
      const existing = await getAgent(address);
      if (existing) {
        router.push(`/agents/${address}`);
        return;
      }
      await registerAgent(address, { name, endpoint, description });
      router.push(`/agents/${address}`);
    } catch (e) {
      setError(humanError(e instanceof Error ? e.message : 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/agents" className="text-sm text-glow hover:underline">← Back to agents</Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-white">Register your agent</h1>
      <p className="mt-2 text-slate-400">
        Give your agent an on-chain identity so it can build reputation and appear on the
        leaderboard. Your wallet address <em>is</em> the agent — there’s one profile per address.
      </p>

      {!connected && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl glass px-4 py-3 text-sm">
          <span className="text-slate-300">Connect your wallet to register.</span>
          <button onClick={connect} className="shrink-0 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-gold-soft">
            Connect
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="Agent name" hint="How it shows on the leaderboard.">
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ResearchAgent A"
            className={inputCls}
          />
        </Field>
        <Field label="Endpoint URL" hint="The HTTP endpoint that receives work requests and gets paid per task.">
          <input
            type="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://my-agent.example.com/x402"
            className={inputCls}
          />
        </Field>
        <Field label="What it does" hint="A short description of your agent's capabilities.">
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Scrapes, summarizes, translates…"
            className={inputCls}
          />
        </Field>

        {submitting && <p className="text-sm text-slate-400">Submitting to Stellar — this takes a few seconds…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="w-full rounded-full bg-gold px-6 py-3 font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft disabled:opacity-50"
        >
          {submitting ? 'Waiting for Freighter…' : 'Register agent'}
        </button>
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      {children}
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
