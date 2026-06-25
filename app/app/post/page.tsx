'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/lib/WalletContext';
import { createBounty } from '@/lib/bountyClient';

const TOKEN_LABEL = process.env.NEXT_PUBLIC_TOKEN_LABEL ?? 'XLM';

export default function PostBountyPage() {
  const router = useRouter();
  const { address, connected, connect } = useWallet();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.5');
  const [deadlineHours, setDeadlineHours] = useState('24');
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

      const id = await createBounty(address, {
        title,
        description,
        amount: parseFloat(amount),
        deadlineHours: parseInt(deadlineHours, 10),
      });

      router.push(`/bounty/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-quest-600 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-quest-600">Post a bounty</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Funds are locked in escrow until you release payment to the agent.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
            placeholder="e.g. Write Stellar payment tutorial"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
            placeholder="Describe what the agent needs to deliver..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount ({TOKEN_LABEL})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Deadline (hours)
            </label>
            <input
              type="number"
              min="1"
              required
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-quest-600 px-6 py-3 text-white shadow hover:bg-quest-500 transition disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Post bounty'}
        </button>
      </form>
    </main>
  );
}