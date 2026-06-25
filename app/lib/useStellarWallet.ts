"use client";

/**
 * useStellarWallet hook — generated via stellar_nextjs_wallet_scaffold
 * Reference: https://github.com/JulioMCruz/Stellar-mcp/docs/STELLAR_NEXTJS_SOROBAN_RESEARCH.md
 */

import { useState, useEffect, useCallback } from "react";
import {
  isConnected,
  getAddress,
  signTransaction,
  getNetwork,
} from "@stellar/freighter-api";

export interface StellarWallet {
  address: string;
  network: string;
  isConnected: boolean;
}

export function useStellarWallet() {
  const [wallet, setWallet] = useState<StellarWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error("Freighter not installed");
      }
      const addressResult = await getAddress();
      if (addressResult.error || !addressResult.address) {
        throw new Error("No address returned");
      }
      const networkResult = await getNetwork();
      setWallet({
        address: addressResult.address,
        network: networkResult.network || "TESTNET",
        isConnected: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setError(null);
  }, []);

  const signTx = useCallback(
    async (xdr: string, networkPassphrase: string): Promise<string> {
      if (!wallet) throw new Error("Wallet not connected");
      const result = await signTransaction(xdr, { networkPassphrase });
      if (result.error) throw new Error(`Sign error: ${result.error}`);
      if (!result.signedTxXdr) throw new Error("No signed tx");
      return result.signedTxXdr;
    },
    [wallet]
  );

  useEffect(() => {
    const auto = async () => {
      try {
        const c = await isConnected();
        if (!c) return;
        const a = await getAddress();
        if (a.address) {
          const n = await getNetwork();
          setWallet({
            address: a.address,
            network: n.network || "TESTNET",
            isConnected: true,
          });
        }
      } catch {
        // silent
      }
    };
    auto();
  }, []);

  return { wallet, loading, error, connect, disconnect, signTx, isConnected: !!wallet };
}
