"use client";

import Link from "next/link";
import { useWallet } from "@/lib/WalletContext";
import { shortAddr } from "@/lib/labels";

export function SiteHeader() {
  const { address, network, connected, connecting, connect, disconnect } = useWallet();
  const isTestnet = (network ?? "TESTNET").toUpperCase().includes("TEST");

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-white">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-glow text-sm font-bold text-ink-950 shadow-glow">
              Q
            </span>
            QuestBoard
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-300 sm:flex">
            <Link href="/dashboard" className="transition hover:text-glow">Dashboard</Link>
            <Link href="/agents" className="transition hover:text-glow">Agents</Link>
            <Link href="/hermes" className="transition hover:text-glow">Hermes</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {connected && address ? (
            <>
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
                  isTestnet
                    ? "bg-gold/15 text-gold-soft ring-1 ring-gold/30"
                    : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                }`}
              >
                {isTestnet ? "TESTNET" : "MAINNET"}
              </span>
              <span className="font-mono text-sm text-slate-300">{shortAddr(address)}</span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/5"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
