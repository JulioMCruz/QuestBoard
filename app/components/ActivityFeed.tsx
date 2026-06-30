'use client';

import useSWR from 'swr';
import { getActivity, type ActivityKind } from '@/lib/activity';

const ICON: Record<ActivityKind, string> = {
  created: '📝',
  claimed: '🤝',
  submitted: '📤',
  paid: '💸',
  refunded: '↩️',
  register: '⭐',
  reputation: '📈',
  x402: '⚡',
};

const TONE: Record<ActivityKind, string> = {
  created: 'bg-quest-100 text-quest-900 dark:bg-quest-900 dark:text-quest-100',
  claimed: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  submitted: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  paid: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
  refunded: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  register: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
  reputation: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  x402: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
};

export function ActivityFeed() {
  const { data, error, isLoading } = useSWR('activity', () => getActivity(), {
    refreshInterval: 8000,
    revalidateOnFocus: true,
  });
  const items = data ?? [];

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Live on-chain activity</h2>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Stellar testnet · auto-refresh
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Every event below is a real transaction. Click any to verify on Stellar Explorer.
      </p>

      <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl glass">
        {isLoading && <Row muted>Loading recent transactions…</Row>}
        {error && <Row muted>Couldn’t reach Soroban RPC. Retrying…</Row>}
        {!isLoading && !error && items.length === 0 && (
          <Row muted>No recent activity. Post a bounty or run the agent demo.</Row>
        )}
        {items.map((it) => (
          <a
            key={it.id}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm ${TONE[it.kind]}`}>
              {ICON[it.kind]}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{it.label}</span>
            <span className="shrink-0 font-mono text-xs text-slate-500">
              {it.txHash.slice(0, 6)}… ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Row({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <div className={`px-4 py-6 text-center text-sm ${muted ? 'text-slate-500' : ''}`}>{children}</div>;
}
