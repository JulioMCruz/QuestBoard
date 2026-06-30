"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/WalletContext";
import { shortAddr } from "@/lib/labels";

const NAV: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/agents", "Agents"],
  ["/hermes", "Hermes"],
  ["/pitchdeck", "Learn more"],
];

export function SiteHeader() {
  const { address, network, connected, connecting, connect, disconnect } = useWallet();
  const isTestnet = (network ?? "TESTNET").toUpperCase().includes("TEST");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The pitch deck is a standalone full-screen experience — no global chrome.
  if (pathname === "/pitchdeck") return null;

  const netBadge = (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
        isTestnet
          ? "bg-gold/15 text-gold-soft ring-1 ring-gold/30"
          : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      }`}
    >
      {isTestnet ? "TESTNET" : "MAINNET"}
    </span>
  );

  const connectBtn = (
    <button
      onClick={connect}
      disabled={connecting}
      className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft disabled:opacity-50"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-white" onClick={() => setOpen(false)}>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-glow text-sm font-bold text-ink-950 shadow-glow">
              Q
            </span>
            QuestBoard
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-300 sm:flex">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="transition hover:text-glow">{label}</Link>
            ))}
          </nav>
        </div>

        {/* desktop wallet cluster */}
        <div className="hidden items-center gap-3 sm:flex">
          {connected && address ? (
            <>
              {netBadge}
              <span className="font-mono text-sm text-slate-300">{shortAddr(address)}</span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/5"
              >
                Disconnect
              </button>
            </>
          ) : (
            connectBtn
          )}
        </div>

        {/* mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-200 transition hover:bg-white/5 sm:hidden"
        >
          <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-white/5 bg-ink/95 px-6 py-4 backdrop-blur-xl sm:hidden">
          <nav className="flex flex-col gap-1 text-sm text-slate-200">
            {NAV.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 transition hover:bg-white/5 hover:text-glow"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-4">
            {connected && address ? (
              <>
                {netBadge}
                <span className="font-mono text-sm text-slate-300">{shortAddr(address)}</span>
                <button
                  onClick={() => { disconnect(); setOpen(false); }}
                  className="ml-auto rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/5"
                >
                  Disconnect
                </button>
              </>
            ) : (
              connectBtn
            )}
          </div>
        </div>
      )}
    </header>
  );
}
