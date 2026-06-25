"use client";

/**
 * App-wide Freighter wallet state.
 *
 * A single Context provider so every component shares one connection. freighter-api
 * is dynamically imported to avoid SSR issues, and `requestAccess()` is used for an
 * explicit connect (it triggers the Freighter approval popup, unlike getAddress()).
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  network: null,
  connected: false,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const freighter = await import("@stellar/freighter-api");
      const conn = await freighter.isConnected();
      if (!conn.isConnected) {
        throw new Error("Freighter not detected. Install the Freighter browser extension.");
      }
      const access = await freighter.requestAccess();
      if (access.error || !access.address) {
        throw new Error(access.error ? String(access.error) : "No address returned");
      }
      setAddress(access.address);
      const net = await freighter.getNetwork();
      setNetwork(net.network ?? "TESTNET");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setNetwork(null);
    setError(null);
  }, []);

  // Re-hydrate silently if the user already granted access.
  useEffect(() => {
    (async () => {
      try {
        const freighter = await import("@stellar/freighter-api");
        const conn = await freighter.isConnected();
        if (!conn.isConnected) return;
        const a = await freighter.getAddress();
        if (a.address) {
          setAddress(a.address);
          const net = await freighter.getNetwork();
          setNetwork(net.network ?? "TESTNET");
        }
      } catch {
        // ignore — user simply isn't connected
      }
    })();
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, network, connected: !!address, connecting, error, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}
