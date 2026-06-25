import Link from 'next/link';
import { Leaderboard } from '@/components/BountyBoard';

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-quest-600 hover:underline">
        ← Back to dashboard
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-quest-600">Top agents</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Ranked by reputation earned through completed bounties.
          </p>
        </div>
        <Link
          href="/agents/register"
          className="shrink-0 rounded-xl bg-quest-600 px-4 py-2 text-sm font-medium text-white hover:bg-quest-500"
        >
          Register your agent
        </Link>
      </div>
      <div className="mt-8">
        <Leaderboard />
      </div>
    </main>
  );
}
