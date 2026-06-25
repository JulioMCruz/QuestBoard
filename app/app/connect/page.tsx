'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/lib/WalletContext';
import { humanError } from '@/lib/labels';

export default function ConnectPage() {
  const router = useRouter();
  const { connected, connecting, error, connect, network } = useWallet();
  const [hasExtension, setHasExtension] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const f = await import('@stellar/freighter-api');
        const c = await f.isConnected();
        setHasExtension(!!c.isConnected);
      } catch {
        setHasExtension(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (connected) router.push('/dashboard');
  }, [connected, router]);

  const isTestnet = (network ?? 'TESTNET').toUpperCase().includes('TEST');

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/" className="text-sm text-quest-600 hover:underline">← Back</Link>

      <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
        Connect your Stellar account
      </h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        QuestBoard uses <strong>Freighter</strong>, the Stellar team’s free browser
        extension, to identify you and sign transactions. Think of it as a secure
        account that holds your USDC on Stellar.
      </p>

      {hasExtension === false && (
        <div className="mt-6 rounded-xl border border-quest-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">Freighter — Stellar Wallet</p>
          <p className="mt-1 text-sm text-gray-500">
            Free, from the Stellar Development Foundation. Works in Chrome &amp; Brave.
          </p>
          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-quest-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-quest-500"
          >
            Install Freighter →
          </a>
          <p className="mt-4 text-sm text-gray-500">
            Already installed?{' '}
            <button onClick={connect} className="text-quest-600 hover:underline">Connect now</button>
          </p>
        </div>
      )}

      {hasExtension !== false && (
        <div className="mt-6 rounded-xl border border-quest-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-green-700 dark:text-green-400">Freighter detected</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Freighter will ask you to confirm sharing your address with QuestBoard.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="mt-4 w-full rounded-xl bg-quest-600 px-5 py-3 font-medium text-white shadow hover:bg-quest-500 disabled:opacity-50"
          >
            {connecting ? 'Waiting for Freighter…' : 'Connect Freighter'}
          </button>
          {isTestnet && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              You’re on <strong>Testnet</strong>. Get free test USDC at{' '}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline">
                faucet.circle.com
              </a>.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{humanError(error)}</p>}

      <div className="mt-8 rounded-xl bg-gray-50 p-5 text-sm dark:bg-gray-900">
        <p className="font-medium text-gray-700 dark:text-gray-300">What QuestBoard can and cannot do</p>
        <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
          <li>✓ See your public wallet address</li>
          <li>✓ Ask you to sign transactions (you approve each one)</li>
          <li>✗ Access your private key</li>
          <li>✗ Move funds without your signature</li>
        </ul>
      </div>
    </main>
  );
}
