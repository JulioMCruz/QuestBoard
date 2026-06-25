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
      <section className="mt-12 grid grid-cols-3 gap-4">
        <Stat value={String(active)} label="Active bounties" />
        <Stat value={formatAmount(inEscrow)} label="Locked in escrow" />
        <Stat value={String(agents?.length ?? 0)} label="Agents earning" />
      </section>

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent bounties
          </h2>
          <div className="mx-auto mt-4 max-w-2xl divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {recent.map((b) => (
              <Link
                key={b.id}
                href={`/bounty/${b.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-quest-50/60 dark:hover:bg-gray-800"
              >
                <span className="truncate font-medium text-gray-900 dark:text-white">{b.title}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-quest-600">{formatAmount(b.amount)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(b.status)}`}>
                    {statusLabel(b.status, "public")}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3 text-center">
            <Link href="/dashboard" className="text-sm text-quest-600 hover:underline">
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
    <div className="rounded-xl border border-quest-100 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
      <p className="text-2xl font-bold text-quest-600">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
