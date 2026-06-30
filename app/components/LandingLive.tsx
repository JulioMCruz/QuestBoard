"use client";

import Link from "next/link";
import useSWR from "swr";
import { listBounties } from "@/lib/bountyClient";
import { formatAmount, statusLabel, statusTone } from "@/lib/labels";

export function LandingLive() {
  const { data: bounties } = useSWR("landing:bounties", () =>
    listBounties(["Open", "Claimed", "Submitted"])
  );
  const recent = (bounties ?? []).slice(0, 6);

  if (recent.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Live on the board</h2>
          <p className="mt-1 text-sm text-slate-400">
            Real bounties, escrowed on Stellar testnet right now.
          </p>
        </div>
        <Link href="/dashboard" className="shrink-0 font-mono text-sm text-glow hover:underline">
          view all →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((b) => (
          <Link
            key={b.id}
            href={`/bounty/${b.id}`}
            className="group rounded-2xl glass p-5 shadow-card transition hover:-translate-y-1 hover:border-glow/50"
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(b.status)}`}>
                {statusLabel(b.status, "public")}
              </span>
              <span className="font-mono text-sm text-gold-soft">{formatAmount(b.amount)}</span>
            </div>
            <p className="mt-3 line-clamp-2 font-medium text-white group-hover:text-glow-soft">
              {b.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
