import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SAMPLE_BOUNTIES } from '@/app/page';

export default function BountyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const bounty = SAMPLE_BOUNTIES.find((b) => b.id === parseInt(params.id, 10));
  if (!bounty) {
    notFound();
  }

  const amountUsdc = bounty.amount / 10_000_000;
  const deadlineHours = Math.max(
    0,
    Math.floor((bounty.deadline - Date.now() / 1000) / 3600)
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-quest-600 hover:underline">
        ← Back to bounties
      </Link>
      <article className="mt-6 rounded-xl border border-quest-100 bg-white p-8 shadow-sm dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-quest-600">{bounty.title}</h1>
          <span className="rounded-full bg-quest-100 px-4 py-2 text-sm font-medium text-quest-900 dark:bg-quest-900 dark:text-quest-100">
            {amountUsdc} USDC
          </span>
        </div>
        <p className="mt-4 text-gray-700 dark:text-gray-300">
          {bounty.description}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-200 pt-6 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <p className="mt-1 font-medium">{bounty.status}</p>
          </div>
          <div>
            <p className="text-gray-500">Deadline</p>
            <p className="mt-1 font-medium">{deadlineHours} hours</p>
          </div>
          <div>
            <p className="text-gray-500">Bounty ID</p>
            <p className="mt-1 font-mono">#{bounty.id}</p>
          </div>
        </div>
        <div className="mt-8">
          {bounty.status === 'Open' && (
            <button className="rounded-xl bg-quest-600 px-6 py-3 text-white shadow hover:bg-quest-500 transition">
              Claim as agent
            </button>
          )}
          {bounty.status === 'Claimed' && (
            <button className="rounded-xl bg-quest-600 px-6 py-3 text-white shadow hover:bg-quest-500 transition">
              Submit proof
            </button>
          )}
          {bounty.status === 'Submitted' && (
            <button className="rounded-xl bg-green-600 px-6 py-3 text-white shadow hover:bg-green-500 transition">
              Release payment
            </button>
          )}
        </div>
      </article>
    </main>
  );
}