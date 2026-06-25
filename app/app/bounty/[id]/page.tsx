'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useWallet } from '@/lib/WalletContext';
import {
  getBountyById,
  claimBounty,
  submitProof,
  releasePayment,
  refundBounty,
} from '@/lib/bountyClient';

const TOKEN_LABEL = process.env.NEXT_PUBLIC_TOKEN_LABEL ?? 'XLM';

export default function BountyDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const { address, connected: isConnected, connect } = useWallet();
  const { data: bounty, error, isLoading, mutate } = useSWR(
    Number.isNaN(id) ? null : `bounty:${id}`,
    () => getBountyById(id)
  );

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [proof, setProof] = useState('');

  async function run(fn: () => Promise<void>) {
    setActionError(null);
    setBusy(true);
    try {
      if (!isConnected || !address) {
        await connect();
        throw new Error('Connect your wallet, then try again.');
      }
      await fn();
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <Shell><p className="text-gray-500">Loading bounty…</p></Shell>;
  }
  if (error) {
    return <Shell><p className="text-red-600">Failed to load: {(error as Error).message}</p></Shell>;
  }
  if (!bounty) {
    return (
      <Shell>
        <p className="text-gray-600 dark:text-gray-300">Bounty #{params.id} not found.</p>
      </Shell>
    );
  }

  const amount = bounty.amount / 10_000_000;
  const deadlineHours = Math.max(0, Math.floor((bounty.deadline - Date.now() / 1000) / 3600));
  const me = address;
  const isPoster = me === bounty.poster;
  const isAgent = me === bounty.agent;

  return (
    <Shell>
      <article className="rounded-xl border border-quest-100 bg-white p-8 shadow-sm dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-quest-600">{bounty.title}</h1>
          <span className="shrink-0 rounded-full bg-quest-100 px-4 py-2 text-sm font-medium text-quest-900 dark:bg-quest-900 dark:text-quest-100">
            {amount} {TOKEN_LABEL}
          </span>
        </div>
        <p className="mt-4 text-gray-700 dark:text-gray-300">{bounty.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-200 pt-6 text-sm">
          <Field label="Status" value={bounty.status} />
          <Field label="Deadline" value={`${deadlineHours} hours`} />
          <Field label="Bounty ID" value={`#${bounty.id}`} mono />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <Field label="Poster" value={short(bounty.poster)} mono />
          <Field label="Agent" value={bounty.agent ? short(bounty.agent) : '—'} mono />
        </div>
        {bounty.submissionProof && (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Submitted proof</p>
            <p className="mt-1 break-all font-mono text-sm">{bounty.submissionProof}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {bounty.status === 'Open' && (
            <ActionButton onClick={() => run(() => claimBounty(me!, bounty.id))} busy={busy}>
              Claim as agent
            </ActionButton>
          )}

          {bounty.status === 'Claimed' && (
            <div className="space-y-2">
              <input
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="Proof (hash, IPFS CID, URL…)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:bg-gray-800 dark:border-gray-700"
              />
              <ActionButton
                onClick={() => run(() => submitProof(me!, bounty.id, proof))}
                busy={busy}
                disabled={!proof.trim()}
              >
                Submit proof
              </ActionButton>
              {!isAgent && me && (
                <p className="text-xs text-amber-600">Only the claiming agent can submit.</p>
              )}
            </div>
          )}

          {bounty.status === 'Submitted' && (
            <ActionButton
              onClick={() => run(() => releasePayment(me!, bounty.id))}
              busy={busy}
              variant="success"
            >
              Release payment
            </ActionButton>
          )}

          {(bounty.status === 'Open' ||
            bounty.status === 'Claimed' ||
            bounty.status === 'Submitted') &&
            isPoster && (
              <button
                onClick={() => run(() => refundBounty(me!, bounty.id))}
                disabled={busy}
                className="w-full rounded-xl border border-red-300 px-6 py-3 text-red-600 hover:bg-red-50 transition disabled:opacity-50 dark:hover:bg-red-950"
              >
                Refund to poster
              </button>
            )}

          {(bounty.status === 'Released' || bounty.status === 'Refunded') && (
            <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              This bounty is finalized ({bounty.status}).
            </p>
          )}

          {!isConnected && (
            <button
              onClick={connect}
              className="w-full rounded-xl border border-quest-600 px-6 py-3 text-quest-600 hover:bg-quest-50 transition"
            >
              Connect Freighter to act
            </button>
          )}

          {actionError && <p className="text-sm text-red-500">{actionError}</p>}
        </div>
      </article>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-quest-600 hover:underline">
        ← Back to dashboard
      </Link>
      <div className="mt-6">{children}</div>
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`mt-1 font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  disabled,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success';
}) {
  const base = variant === 'success' ? 'bg-green-600 hover:bg-green-500' : 'bg-quest-600 hover:bg-quest-500';
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`w-full rounded-xl px-6 py-3 text-white shadow transition disabled:opacity-50 ${base}`}
    >
      {busy ? 'Submitting…' : children}
    </button>
  );
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
