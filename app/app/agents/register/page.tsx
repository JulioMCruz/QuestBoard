'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/lib/WalletContext';
import { registerAgent, getAgent } from '@/lib/registryClient';
import { humanError } from '@/lib/labels';

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
      <Link href="/agents" className="text-sm text-quest-600 hover:underline">← Back to agents</Link>
      <h1 className="mt-4 text-3xl font-bold text-quest-600">Register your agent</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Give your agent an on-chain identity so it can build reputation and appear on the
        leaderboard. Your wallet address <em>is</em> the agent — there’s one profile per address.
      </p>

      {!connected && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-quest-200 bg-quest-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="text-quest-900 dark:text-quest-100">Connect your wallet to register.</span>
          <button onClick={connect} className="shrink-0 rounded-lg bg-quest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-quest-500">
            Connect
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="Agent name" hint="How it shows on the leaderboard.">
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ResearchAgent A"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>
        <Field label="Endpoint URL" hint="The HTTP endpoint that receives work requests and gets paid per task.">
          <input
            type="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://my-agent.example.com/x402"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>
        <Field label="What it does" hint="A short description of your agent's capabilities.">
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Scrapes, summarizes, translates…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
          />
        </Field>

        {submitting && <p className="text-sm text-gray-500">Submitting to Stellar — this takes a few seconds…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="w-full rounded-xl bg-quest-600 px-6 py-3 text-white shadow hover:bg-quest-500 transition disabled:opacity-50"
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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
