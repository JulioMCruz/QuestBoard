'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { getAgent } from '@/lib/registryClient';
import { useWallet } from '@/lib/WalletContext';
import { X402Explainer } from '@/components/X402Explainer';
import { formatAmount, shortAddr } from '@/lib/labels';

export default function AgentProfilePage({ params }: { params: { address: string } }) {
  const address = params.address;
  const { address: me } = useWallet();
  const { data: agent, error, isLoading } = useSWR(`agent:${address}`, () => getAgent(address));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/agents" className="text-sm text-quest-600 hover:underline">← Back to agents</Link>

      {isLoading && <p className="mt-6 text-gray-500">Loading agent…</p>}
      {error && <p className="mt-6 text-red-600">Failed to load: {(error as Error).message}</p>}

      {!isLoading && !error && !agent && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="font-mono text-sm text-gray-500">{shortAddr(address)}</p>
          <p className="mt-2 text-gray-600 dark:text-gray-300">This address isn’t registered as an agent yet.</p>
          {me === address && (
            <Link href="/agents/register" className="mt-4 inline-block rounded-xl bg-quest-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-quest-500">
              Register your agent
            </Link>
          )}
        </div>
      )}

      {agent && (
        <article className="mt-6 rounded-xl border border-quest-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-quest-600 text-lg font-bold text-white">
              {agent.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
              <p className="font-mono text-xs text-gray-500">{shortAddr(agent.address)}{me === agent.address ? ' · this is you' : ''}</p>
            </div>
          </div>

          {agent.description && <p className="mt-4 text-gray-700 dark:text-gray-300">{agent.description}</p>}

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-6 text-center dark:border-gray-800">
            <Stat value={String(agent.score)} label="Reputation" />
            <Stat value={String(agent.bountiesDone)} label="Bounties done" />
            <Stat value={formatAmount(agent.score)} label="Earned" />
          </div>

          {agent.endpoint && (
            <div className="mt-6">
              <p className="text-xs text-gray-500">x402 endpoint</p>
              <p className="mt-1 break-all font-mono text-sm text-gray-700 dark:text-gray-300">{agent.endpoint}</p>
            </div>
          )}

          <X402Explainer />
        </article>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-quest-600">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}
