"use client";

import { useStellarWallet } from "./useStellarWallet";

export function WalletButton() {
  const { wallet, loading, error, connect, disconnect, isConnected } =
    useStellarWallet();

  if (isConnected && wallet) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-quest-100 px-3 py-1 text-xs font-medium text-quest-900">
          {wallet.network}
        </span>
        <span className="font-mono text-sm text-gray-600">
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
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
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={connect}
        disabled={loading}
        className="rounded-xl bg-quest-600 px-6 py-2 text-white shadow hover:bg-quest-500 transition disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Freighter"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
