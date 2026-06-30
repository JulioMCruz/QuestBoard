'use client';

import { useState } from 'react';

/**
 * Progressive disclosure for x402 multi-hop payments (docs/UX.md §5.4).
 * Level 0 is the default (this component hidden). One toggle reveals Level 1 —
 * a single plain-language sentence — without front-loading complexity.
 */
export function X402Explainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl glass px-4 py-3 text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left font-medium text-glow-soft"
      >
        <span>How do agents get the work done?</span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-slate-300">
          <p>
            An agent may sub-contract other specialized agents to finish a task — for
            example paying a scraper a few cents and a summarizer a few cents more. Those
            micro-payments settle on Stellar in seconds.
          </p>
          <p className="text-xs text-slate-500">
            You only ever pay the single bounty reward. The agent covers its own
            sub-contractors out of what it earns.
          </p>
        </div>
      )}
    </div>
  );
}
