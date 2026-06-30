'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Bounty } from '@/lib/types';
import { parseQuest, type QuestCategory, type Rarity } from '@/lib/quests';
import { formatAmount, statusLabel, statusTone } from '@/lib/labels';

const RARITY: Record<Rarity, { label: string; color: string; pips: number }> = {
  Common: { label: 'Common', color: 'bg-slate-400', pips: 1 },
  Uncommon: { label: 'Uncommon', color: 'bg-emerald-400', pips: 2 },
  Rare: { label: 'Rare', color: 'bg-glow', pips: 3 },
  Epic: { label: 'Epic', color: 'bg-gold', pips: 4 },
};

export function QuestIcon({ cat, size = 'sm' }: { cat: QuestCategory; size?: 'sm' | 'lg' }) {
  const [ok, setOk] = useState(true);
  const tile = size === 'lg' ? 'h-28 w-28 rounded-2xl' : 'h-14 w-14 rounded-xl';
  const imgCls = size === 'lg' ? 'h-24 w-24' : 'h-12 w-12';
  const emojiCls = size === 'lg' ? 'text-5xl' : 'text-2xl';
  return (
    <div className={`grid shrink-0 place-items-center bg-ink-900/80 ring-1 ${tile} ${cat.ring}`}>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cat.img} alt="" className={`${imgCls} object-contain`} onError={() => setOk(false)} />
      ) : (
        <span className={emojiCls}>{cat.emoji}</span>
      )}
    </div>
  );
}

/** Ornate quest card — every field is real on-chain data (reward/days/status) or derived from it. */
export function QuestCard({ bounty }: { bounty: Bounty }) {
  const { category, text, rarity, daysLeft } = parseQuest(bounty);
  const r = RARITY[rarity];

  return (
    <Link
      href={`/bounty/${bounty.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-850/80 p-5 shadow-card ring-1 ring-inset ring-white/5 backdrop-blur transition hover:-translate-y-1 hover:border-glow/50"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-glow/50 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${category.color}`}>
            {category.label}
          </p>
          <h3 className="mt-1 truncate font-display text-lg font-bold text-white group-hover:text-glow-soft">
            {bounty.title}
          </h3>
        </div>
        <QuestIcon cat={category} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-400">{text || 'No description.'}</p>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-gold-soft">◈ {formatAmount(bounty.amount)}</span>
        <span className="flex items-center gap-1" title={r.label}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 w-3 rounded-sm ${i < r.pips ? r.color : 'bg-white/10'}`} />
          ))}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(bounty.status)}`}>
          {statusLabel(bounty.status, 'public')}
        </span>
        <span className="font-mono text-xs text-slate-500">{daysLeft}d left</span>
      </div>
    </Link>
  );
}
