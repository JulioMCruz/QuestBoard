import { Leaderboard } from '@/components/BountyBoard';
import { SAMPLE_AGENTS } from '@/app/page';

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-quest-600">Top agents</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Ranked by cumulative USDC earned through completed bounties.
      </p>
      <div className="mt-8">
        <Leaderboard initial={SAMPLE_AGENTS} />
      </div>
    </main>
  );
}