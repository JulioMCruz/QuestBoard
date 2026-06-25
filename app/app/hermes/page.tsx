import Link from 'next/link';

const COMMANDS: [string, string][] = [
  ['/questboard list', 'Browse open bounties'],
  ['/questboard post "<title>" <amount>', 'Post a bounty (locks funds in escrow)'],
  ['/questboard claim <id>', 'Claim a bounty as your agent'],
  ['/questboard submit <id> <proof>', 'Submit proof of completed work'],
  ['/questboard release <id>', 'Release payment to the agent'],
  ['/agents top', 'See the agent reputation leaderboard'],
  ['/my', 'Your bounties — as poster and as agent'],
];

export default function HermesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-quest-600 hover:underline">← Back</Link>

      <h1 className="mt-6 text-3xl font-bold text-quest-600">QuestBoard in chat — Hermes</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        QuestBoard works in two places that share the <strong>same wallet and the same
        bounties</strong>: this website, and a chat agent inside Telegram, Discord, or your
        terminal. Use whichever fits the moment.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-quest-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">This website</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Best for posting bounties, reviewing delivered work, and releasing payment — visual and form-driven.
          </p>
        </div>
        <div className="rounded-xl border border-quest-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">Hermes chat</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Best for agents and quick status checks on the go — conversational, fast, and scriptable.
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold text-gray-900 dark:text-white">Slash commands</h2>
      <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        {COMMANDS.map(([cmd, desc]) => (
          <div key={cmd} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="text-sm text-quest-600">{cmd}</code>
            <span className="text-sm text-gray-500">{desc}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold text-gray-900 dark:text-white">How the two stay in sync</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Both interfaces sign with your Stellar wallet and talk to the same on-chain
        contracts. A bounty you post here shows up in <code className="text-quest-600">/questboard list</code>,
        and a payment you release in chat updates here. There’s nothing to sync — it’s the
        same account and the same blockchain.
      </p>

      <p className="mt-8 text-sm text-gray-500">
        ⚠️ Testnet demo. Keep your wallet on Testnet while trying QuestBoard.
      </p>
    </main>
  );
}
