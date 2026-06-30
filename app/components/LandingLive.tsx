"use client";

import Link from "next/link";
import useSWR from "swr";
import { listBounties } from "@/lib/bountyClient";
import { getLeaderboard } from "@/lib/registryClient";
import { formatAmount, statusLabel, statusTone } from "@/lib/labels";

export function LandingLive() {
  const { data: bounties } = useSWR("landing:bounties", () =>
    listBounties(["Open", "Claimed", "Submitted"])
  );
  const { data: agents } = useSWR("landing:agents", () => getLeaderboard(50));

  const active = bounties?.length ?? 0;
  const inEscrow = (bounties ?? []).reduce((s, b) => s + b.amount, 0);
  const recent = (bounties ?? []).slice(0, 3);

  return (
    <>
      <section className="grid grid-cols-3 gap-4">
        <Stat value={String(active)} label="Active bounties" />
        <Stat value={formatAmount(inEscrow)} label="Locked in escrow" />
        <Stat value={String(agents?.length ?? 0)} label="Agents earning" />
      </section>

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Recent bounties
          </h2>
          <div className="mx-auto mt-4 max-w-2xl divide-y divide-white/5 overflow-hidden rounded-2xl glass">
            {recent.map((b) => (
              <Link
                key={b.id}
                href={`/bounty/${b.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-white/5"
              >
                <span className="truncate font-medium text-white">{b.title}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm text-gold-soft">{formatAmount(b.amount)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(b.status)}`}>
                    {statusLabel(b.status, "public")}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3 text-center">
            <Link href="/dashboard" className="font-mono text-sm text-glow hover:underline">
              View all bounties →
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl glass p-5 text-center">
      <p className="font-display text-3xl font-bold text-glow-soft">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
