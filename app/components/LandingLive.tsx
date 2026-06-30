"use client";

import Link from "next/link";
import useSWR from "swr";
import { listBounties } from "@/lib/bountyClient";
import { QuestCard } from "@/components/QuestCard";

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
        <Link href="/board" className="shrink-0 font-mono text-sm text-glow hover:underline">
          view all →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((b) => (
          <QuestCard key={b.id} bounty={b} />
        ))}
      </div>
    </section>
  );
}
