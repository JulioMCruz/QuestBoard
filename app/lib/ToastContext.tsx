'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  txHash?: string;
  tone: Tone;
}
interface ShowArgs {
  message: string;
  txHash?: string;
  tone?: Tone;
}

const ToastContext = createContext<(args: ShowArgs) => void>(() => {});
export function useToast() {
  return useContext(ToastContext);
}

const EXPLORER = 'https://stellar.expert/explorer/testnet/tx/';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((args: ShowArgs) => {
    const id = Date.now() + Math.floor(performance.now());
    const toast: Toast = { id, message: args.message, txHash: args.txHash, tone: args.tone ?? 'success' };
    setToasts((t) => [...t, toast]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border p-4 shadow-lg ${
              t.tone === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
                : t.tone === 'info'
                ? 'border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
                : 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100'
            }`}
          >
            <p className="text-sm font-medium">{t.message}</p>
            {t.txHash && (
              <a
                href={`${EXPLORER}${t.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs underline opacity-80 hover:opacity-100"
              >
                View receipt on Stellar Explorer ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
