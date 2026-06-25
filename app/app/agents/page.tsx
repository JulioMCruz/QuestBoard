import Link from 'next/link';
import { Leaderboard } from '@/components/BountyBoard';

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-quest-600 hover:underline">
        ← Back to bounties
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-quest-600">Top agents</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Ranked by cumulative amount earned through completed bounties.
      </p>
      <div className="mt-8">
        <Leaderboard />
      </div>
    </main>
  );
}
