'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useWallet } from '@/lib/WalletContext';
import { useToast } from '@/lib/ToastContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { X402Explainer } from '@/components/X402Explainer';
import {
  getBountyById,
  claimBounty,
  submitProof,
  releasePayment,
  refundBounty,
} from '@/lib/bountyClient';
import {
  formatAmount,
  statusLabel,
  statusTone,
  escrowLine,
  humanError,
  shortAddr,
  type Role,
} from '@/lib/labels';

const FACTORY_ID = process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ID ?? '';

export default function BountyDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const { address, connected: isConnected, connect } = useWallet();
  const showToast = useToast();
  const { data: bounty, error, isLoading, mutate } = useSWR(
    Number.isNaN(id) ? null : `bounty:${id}`,
    () => getBountyById(id),
    { refreshInterval: 10000 }
  );

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [proof, setProof] = useState('');
  const [confirm, setConfirm] = useState<null | 'release' | 'refund'>(null);

  async function run(fn: () => Promise<string | undefined | void>, successMsg: string) {
    setActionError(null);
    setBusy(true);
    try {
      if (!isConnected || !address) {
        await connect();
        throw new Error('Connect your wallet, then try again.');
      }
      const hash = await fn();
      setConfirm(null);
      await mutate();
      showToast({ message: successMsg, txHash: typeof hash === 'string' ? hash : undefined });
    } catch (e) {
      setActionError(humanError(e instanceof Error ? e.message : 'Transaction failed'));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <Shell><p className="text-gray-500">Loading bounty…</p></Shell>;
  if (error) return <Shell><p className="text-red-600">Failed to load: {(error as Error).message}</p></Shell>;
  if (!bounty)
    return (
      <Shell>
        <p className="text-gray-600 dark:text-gray-300">Bounty #{params.id} not found.</p>
      </Shell>
    );

  const amountLabel = formatAmount(bounty.amount);
  const deadlineHours = Math.max(0, Math.floor((bounty.deadline - Date.now() / 1000) / 3600));
  const me = address;
  const isPoster = me === bounty.poster;
  const isAgent = me === bounty.agent;
  const role: Role = isPoster ? 'poster' : isAgent ? 'agent' : 'public';
  const finalized = bounty.status === 'Released' || bounty.status === 'Refunded';

  return (
    <Shell>
      <article className="rounded-xl border border-quest-100 bg-white p-8 shadow-sm dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-quest-600">{bounty.title}</h1>
          <span className="shrink-0 rounded-full bg-quest-100 px-4 py-2 text-sm font-medium text-quest-900 dark:bg-quest-900 dark:text-quest-100">
            {amountLabel}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(bounty.status)}`}>
            {statusLabel(bounty.status, role)}
          </span>
          {!finalized && <span className="text-xs text-gray-500">Expires in {deadlineHours}h</span>}
        </div>

        <p className="mt-4 text-gray-700 dark:text-gray-300">{bounty.description}</p>

        {/* Where are my funds? — for the poster */}
        {isPoster && (
          <p className="mt-5 rounded-lg bg-quest-50 px-4 py-2.5 text-sm text-quest-900 dark:bg-gray-800 dark:text-quest-100">
            {escrowLine(bounty.status, amountLabel)}
            {!finalized && ' · Only you can release payment.'}
          </p>
        )}

        <X402Explainer />

        <div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <Field label="Poster" value={shortAddr(bounty.poster)} mono />
          <Field label="Agent" value={bounty.agent ? shortAddr(bounty.agent) : '—'} mono />
        </div>

        {bounty.submissionProof && (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Submitted proof</p>
            <p className="mt-1 break-all font-mono text-sm">{bounty.submissionProof}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {bounty.status === 'Open' && (
            <ActionButton onClick={() => run(() => claimBounty(me!, bounty.id), "Bounty claimed — you're on it.")} busy={busy}>
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
                onClick={() => run(() => submitProof(me!, bounty.id, proof), 'Proof submitted — awaiting approval.')}
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

          {bounty.status === 'Submitted' && isPoster && (
            <button
              onClick={() => setConfirm('release')}
              disabled={busy}
              className="w-full rounded-xl bg-green-600 px-6 py-3 text-white shadow hover:bg-green-500 transition disabled:opacity-50"
            >
              Review &amp; release payment
            </button>
          )}

          {/* Refund: a primary button only when no agent is working; a quiet,
              warned link while a claim is in flight (don't cancel active work casually). */}
          {bounty.status === 'Open' && isPoster && (
            <button
              onClick={() => setConfirm('refund')}
              disabled={busy}
              className="w-full rounded-xl border border-red-300 px-6 py-3 text-red-600 hover:bg-red-50 transition disabled:opacity-50 dark:hover:bg-red-950"
            >
              Get my funds back
            </button>
          )}
          {(bounty.status === 'Claimed' || bounty.status === 'Submitted') && isPoster && (
            <button
              onClick={() => setConfirm('refund')}
              disabled={busy}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              Cancel &amp; refund — this cancels the agent’s active work
            </button>
          )}

          {finalized && (
            <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              This bounty is {statusLabel(bounty.status, role).toLowerCase()}.
            </p>
          )}

          {!isConnected && (
            <button
              onClick={connect}
              className="w-full rounded-xl border border-quest-600 px-6 py-3 text-quest-600 hover:bg-quest-50 transition"
            >
              Connect your wallet to act
            </button>
          )}

          {busy && (
            <p className="text-sm text-gray-500">Submitting to Stellar — this takes a few seconds…</p>
          )}
          {actionError && <p className="text-sm text-red-500">{actionError}</p>}
        </div>

        {FACTORY_ID && (
          <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${FACTORY_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-quest-600"
            >
              View contract on Stellar Explorer ↗
            </a>
          </p>
        )}
      </article>

      <ConfirmModal
        open={confirm === 'release'}
        title="Release payment"
        message={
          <>
            Send <strong>{amountLabel}</strong> to {shortAddr(bounty.agent ?? '')} for completing this
            bounty? This can’t be undone.
          </>
        }
        confirmLabel="Release payment"
        busy={busy}
        onConfirm={() => run(() => releasePayment(me!, bounty.id), 'Payment released to the agent.')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm === 'refund'}
        title="Get your funds back"
        message={
          <>
            Return <strong>{amountLabel}</strong> to your wallet and close this bounty? This can’t be
            undone.
          </>
        }
        confirmLabel="Get my funds back"
        danger
        busy={busy}
        onConfirm={() => run(() => refundBounty(me!, bounty.id), 'Funds returned to your wallet.')}
        onCancel={() => setConfirm(null)}
      />
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="w-full rounded-xl bg-quest-600 px-6 py-3 text-white shadow transition hover:bg-quest-500 disabled:opacity-50"
    >
      {busy ? 'Waiting for Freighter…' : children}
    </button>
  );
}
