import { describe, it, expect } from 'vitest';
import { encodeIcon, stripMarker, rarityOf, daysLeft, categoryOf, parseQuest } from '../lib/quests';
import type { Bounty } from '../lib/types';

function bounty(over: Partial<Bounty>): Bounty {
  return {
    id: 1,
    poster: 'GPOSTER',
    title: '',
    description: '',
    token: 'TOKEN',
    amount: 0,
    deadline: 0,
    status: 'Open',
    createdAt: 0,
    ...over,
  };
}

describe('quests — on-chain meta encoding', () => {
  it('encodes then strips the marker (round-trip)', () => {
    const d = encodeIcon('Do the thing', 'security');
    expect(d).toContain('[qb:security]');
    expect(stripMarker(d)).toBe('Do the thing');
  });

  it('null key leaves a clean description', () => {
    expect(encodeIcon('hello', null)).toBe('hello');
  });

  it('replaces an existing marker instead of stacking', () => {
    const twice = encodeIcon(encodeIcon('x', 'docs'), 'design');
    expect(twice.match(/\[qb:/g)).toHaveLength(1);
    expect(twice).toContain('[qb:design]');
  });
});

describe('quests — category resolution', () => {
  it('reads the marker first', () => {
    expect(categoryOf(bounty({ description: 'whatever\n\n[qb:qa]' })).key).toBe('qa');
  });

  it('falls back to title keywords', () => {
    expect(categoryOf(bounty({ title: 'Find the Bug', description: 'no marker' })).key).toBe('security');
    expect(categoryOf(bounty({ title: 'Build a dApp', description: '' })).key).toBe('development');
    expect(categoryOf(bounty({ title: 'Create Content', description: '' })).key).toBe('content');
  });

  it('defaults to development', () => {
    expect(categoryOf(bounty({ title: 'zzz', description: 'zzz' })).key).toBe('development');
  });
});

describe('quests — derived fields (real data)', () => {
  it('maps escrowed amount (base units) to rarity tiers', () => {
    expect(rarityOf(0.5e7)).toBe('Common');
    expect(rarityOf(2e7)).toBe('Uncommon');
    expect(rarityOf(10e7)).toBe('Rare');
    expect(rarityOf(25e7)).toBe('Epic');
  });

  it('daysLeft is non-negative whole days', () => {
    const inAWeek = Math.floor(Date.now() / 1000) + 7 * 86_400;
    expect(daysLeft(inAWeek)).toBeGreaterThanOrEqual(6);
    expect(daysLeft(0)).toBe(0);
  });

  it('parseQuest composes category + clean text + rarity + daysLeft', () => {
    const b = bounty({
      title: 'Write Docs',
      description: 'Help the team\n\n[qb:docs]',
      amount: 6e7,
      deadline: Math.floor(Date.now() / 1000) + 3 * 86_400,
    });
    const p = parseQuest(b);
    expect(p.category.key).toBe('docs');
    expect(p.text).toBe('Help the team');
    expect(p.rarity).toBe('Rare');
    expect(p.daysLeft).toBeGreaterThanOrEqual(2);
  });
});
