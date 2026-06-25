"use client";

import Link from "next/link";
import { useWallet } from "@/lib/WalletContext";
import { shortAddr } from "@/lib/labels";

export function SiteHeader() {
  const { address, network, connected, connecting, connect, disconnect } = useWallet();
  const isTestnet = (network ?? "TESTNET").toUpperCase().includes("TEST");

  return (
    <header className="sticky top-0 z-20 border-b border-quest-100/60 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-black/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-quest-600">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-quest-600 text-sm text-white">Q</span>
            QuestBoard
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-gray-600 dark:text-gray-300 sm:flex">
            <Link href="/dashboard" className="hover:text-quest-600">Dashboard</Link>
            <Link href="/agents" className="hover:text-quest-600">Agents</Link>
            <Link href="/hermes" className="hover:text-quest-600">Hermes</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {connected && address ? (
            <>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  isTestnet
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                }`}
              >
                {isTestnet ? "TESTNET" : "MAINNET"}
              </span>
              <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{shortAddr(address)}</span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="rounded-xl bg-quest-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-quest-500 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
