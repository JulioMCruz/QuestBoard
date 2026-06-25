"use client";

import { useWallet } from "@/lib/WalletContext";

export function WalletButton() {
  const { address, network, connecting, error, connect, disconnect, connected } = useWallet();

  if (connected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-quest-100 px-3 py-1 text-xs font-medium text-quest-900">
          {network ?? "TESTNET"}
        </span>
        <span className="font-mono text-sm text-gray-600">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={connect}
        disabled={connecting}
        className="rounded-xl bg-quest-600 px-6 py-2 text-white shadow hover:bg-quest-500 transition disabled:opacity-50"
      >
        {connecting ? "Connecting…" : "Connect Freighter"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
