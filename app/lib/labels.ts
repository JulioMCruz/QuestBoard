/**
 * Plain-language labels and helpers — keep crypto/contract jargon out of the UI.
 * See docs/UX.md §5 (clarity & trust principles).
 */

import type { Bounty } from "./types";

export type Role = "poster" | "agent" | "public";

/** Status text that tells the viewer what it means *for them*. */
export function statusLabel(status: Bounty["status"], role: Role): string {
  const map: Record<Bounty["status"], Record<Role, string>> = {
    Open: { poster: "Waiting for an agent", agent: "Available to claim", public: "Open" },
    Claimed: { poster: "Agent is working", agent: "You're working on this", public: "In progress" },
    Submitted: { poster: "Ready to review", agent: "Awaiting approval", public: "Under review" },
    Released: { poster: "Completed — paid", agent: "Completed — earned", public: "Completed" },
    Refunded: { poster: "Refunded to you", agent: "Refunded to poster", public: "Closed" },
  };
  return map[status]?.[role] ?? status;
}

/** Color treatment for a status pill. */
export function statusTone(status: Bounty["status"]): string {
  switch (status) {
    case "Open":
      return "bg-quest-100 text-quest-900 dark:bg-quest-900 dark:text-quest-100";
    case "Claimed":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100";
    case "Submitted":
      return "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100";
    case "Released":
      return "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100";
    case "Refunded":
      return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

/** "Where are my funds?" line for a poster, by status. */
export function escrowLine(status: Bounty["status"], amountLabel: string): string {
  switch (status) {
    case "Open":
      return `${amountLabel} locked — protected until you approve`;
    case "Claimed":
      return `${amountLabel} locked — agent is working`;
    case "Submitted":
      return `${amountLabel} ready to release — review the work`;
    case "Released":
      return `${amountLabel} sent to the agent`;
    case "Refunded":
      return `${amountLabel} returned to your wallet`;
  }
}

const TOKEN_LABEL = process.env.NEXT_PUBLIC_TOKEN_LABEL ?? "XLM";

/** Base units (7 decimals) → "5 XLM". */
export function formatAmount(baseUnits: number): string {
  const n = baseUnits / 10_000_000;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${s} ${TOKEN_LABEL}`;
}

/**
 * Compact amount for aggregate stats (e.g. "1.2k XLM", "3.4M XLM"). Small values stay exact.
 * Use for totals/leaderboards; keep `formatAmount` for individual bounty rewards.
 */
export function formatAmountCompact(baseUnits: number): string {
  const n = baseUnits / 10_000_000;
  let s: string;
  if (n >= 1_000_000) s = `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  else if (n >= 1_000) s = `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  else s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${s} ${TOKEN_LABEL}`;
}

export function shortAddr(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

/** Map a raw chain/wallet error to a human message. */
export function humanError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not detected") || m.includes("not installed"))
    return "Freighter isn't installed. Install it from freighter.app, then try again.";
  if (m.includes("rejected") || m.includes("cancel"))
    return "You cancelled the transaction. Ready when you are.";
  if (m.includes("balance") || m.includes("not within the allowed range"))
    return "You don't have enough balance for this. Get test funds and try again.";
  if (m.includes("not open") || m.includes("already"))
    return "This bounty was just updated by someone else. Refresh and try again.";
  if (m.includes("timeout") || m.includes("timed out"))
    return "Stellar is taking longer than expected. Check stellar.expert, or try again.";
  return message;
}
