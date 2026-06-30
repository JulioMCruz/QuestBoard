'use client';

import { useEffect } from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog for irreversible actions (release / refund). */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-ink-850 p-6 shadow-card ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-white">{title}</h2>
        <div className="mt-2 text-sm text-slate-300">{message}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-ink-950 shadow transition disabled:opacity-50 ${
              danger ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
          >
            {busy ? 'Waiting for Freighter…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
