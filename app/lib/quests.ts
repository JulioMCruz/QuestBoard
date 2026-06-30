/**
 * Quest categories + on-chain meta encoding.
 *
 * The contract has no "category"/"icon" field, so the poster's icon choice is persisted *inside the
 * bounty description* as a trailing marker `[qb:<key>]`. This keeps it 100% real/on-chain — no fake
 * data, no off-chain DB. Everything else on a card maps to real fields: reward = amount, days-left =
 * deadline, status = status, rarity = derived from amount.
 */

import type { Bounty } from './types';

export type QuestKey = 'development' | 'security' | 'docs' | 'design' | 'qa' | 'content';

export interface QuestCategory {
  key: QuestKey;
  label: string;
  emoji: string; // fallback glyph if the icon image is missing
  color: string; // accent text class
  ring: string; // accent ring class for the icon tile
  img: string; // /quests/<key>.png (brand icon set)
  keywords: string[]; // for deriving a category from the title when no marker is present
}

export const QUESTS: QuestCategory[] = [
  { key: 'development', label: 'Development', emoji: '🧊', color: 'text-glow-soft', ring: 'ring-glow/40', img: '/quests/development.png', keywords: ['dapp', 'app', 'code', 'contract', 'build', 'api', 'integrat', 'sdk'] },
  { key: 'security', label: 'Security', emoji: '🐞', color: 'text-red-300', ring: 'ring-red-400/40', img: '/quests/security.png', keywords: ['bug', 'audit', 'vulnerab', 'security', 'exploit', 'fix'] },
  { key: 'docs', label: 'Docs', emoji: '📖', color: 'text-amber-200', ring: 'ring-amber-300/40', img: '/quests/docs.png', keywords: ['doc', 'guide', 'tutorial', 'write', 'readme', 'explain'] },
  { key: 'design', label: 'Design', emoji: '🎨', color: 'text-bloom-soft', ring: 'ring-bloom/40', img: '/quests/design.png', keywords: ['design', 'asset', 'logo', 'ui', 'ux', 'art', 'figma', 'icon'] },
  { key: 'qa', label: 'QA', emoji: '✅', color: 'text-emerald-300', ring: 'ring-emerald-400/40', img: '/quests/qa.png', keywords: ['test', 'qa', 'protocol', 'verify', 'review', 'check'] },
  { key: 'content', label: 'Content', emoji: '🎬', color: 'text-gold-soft', ring: 'ring-gold/40', img: '/quests/content.png', keywords: ['content', 'video', 'tweet', 'blog', 'market', 'social', 'translate'] },
];

const QUEST_BY_KEY = Object.fromEntries(QUESTS.map((q) => [q.key, q])) as Record<QuestKey, QuestCategory>;

const MARKER = /\s*\[qb:(\w+)\]\s*$/;

/** Append/replace the icon marker on a description (no marker when key is null). */
export function encodeIcon(description: string, key: QuestKey | null): string {
  const clean = description.replace(MARKER, '').trimEnd();
  return key ? `${clean}\n\n[qb:${key}]` : clean;
}

/** Human-facing description with the marker removed. */
export function stripMarker(description: string): string {
  return description.replace(MARKER, '').trimEnd();
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic';

/** Rarity derived from the real escrowed amount (base units, 7 decimals). */
export function rarityOf(amountBase: number): Rarity {
  const xlm = amountBase / 10_000_000;
  if (xlm >= 20) return 'Epic';
  if (xlm >= 5) return 'Rare';
  if (xlm >= 1) return 'Uncommon';
  return 'Common';
}

/** Whole days remaining until the on-chain deadline (unix seconds). */
export function daysLeft(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now() / 1000) / 86_400));
}

/** Resolve a bounty's category: from the marker, else keyword-match the title, else Development. */
export function categoryOf(bounty: Bounty): QuestCategory {
  const m = bounty.description.match(MARKER);
  if (m && QUEST_BY_KEY[m[1] as QuestKey]) return QUEST_BY_KEY[m[1] as QuestKey];
  const t = bounty.title.toLowerCase();
  for (const q of QUESTS) if (q.keywords.some((k) => t.includes(k))) return q;
  return QUESTS[0];
}

export interface ParsedQuest {
  category: QuestCategory;
  text: string;
  rarity: Rarity;
  daysLeft: number;
}

export function parseQuest(bounty: Bounty): ParsedQuest {
  return {
    category: categoryOf(bounty),
    text: stripMarker(bounty.description),
    rarity: rarityOf(bounty.amount),
    daysLeft: daysLeft(bounty.deadline),
  };
}
