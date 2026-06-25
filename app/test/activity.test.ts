import { describe, it, expect } from 'vitest';
import {
  buildLifecycleItem,
  buildTransferItem,
  sortAndCap,
  formatXlm,
  formatUsdc,
  shortAddr,
  explorerTx,
  type ActivityBase,
  type ActivityItem,
} from '../lib/activity';

const A = 'GB5IY6OELAKSTQPE3RCRWW6ZHK2YCQJIVOWBPXGWUPGRQWK6YECONDOE';
const B = 'GAYHX54UTMNW6DYSMW3KWRFN2YDHNDSZGJ6FOLBZ6565FUXSEIDTWVYW';
const names: Record<string, string> = { [A]: 'ResearchAgent A', [B]: 'ScraperBot B' };
const nameOf = (a: string) => names[a] ?? shortAddr(a);

const base: ActivityBase = {
  id: 'evt-1',
  ledger: 100,
  txHash: 'abc123def456',
  href: explorerTx('abc123def456'),
};

describe('formatting helpers', () => {
  it('formats XLM from base units', () => {
    expect(formatXlm(30_000_000)).toBe('3 XLM');
    expect(formatXlm(0)).toBe('0 XLM');
  });
  it('formats USDC to 2dp', () => {
    expect(formatUsdc(500_000)).toBe('0.05 USDC');
    expect(formatUsdc(300_000)).toBe('0.03 USDC');
  });
  it('shortens addresses', () => {
    expect(shortAddr(A)).toBe('GB5I…NDOE');
    expect(shortAddr('')).toBe('');
  });
  it('builds an explorer tx link', () => {
    expect(explorerTx('deadbeef')).toBe('https://stellar.expert/explorer/testnet/tx/deadbeef');
  });
});

describe('buildLifecycleItem', () => {
  it('labels a created bounty with locked amount', () => {
    const it_ = buildLifecycleItem(['bounty', 'created'], [5, A, 30_000_000], base, nameOf)!;
    expect(it_.kind).toBe('created');
    expect(it_.label).toBe('Bounty #5 posted — 3 XLM locked');
    expect(it_.href).toContain('/tx/abc123def456');
  });

  it('labels a claim with the agent name', () => {
    const it_ = buildLifecycleItem(['bounty', 'claimed'], [5, A], base, nameOf)!;
    expect(it_).toMatchObject({ kind: 'claimed', label: 'Bounty #5 claimed by ResearchAgent A' });
  });

  it('labels a submission', () => {
    const it_ = buildLifecycleItem(['bounty', 'submitted'], [5, A], base, nameOf)!;
    expect(it_).toMatchObject({ kind: 'submitted', label: 'Proof submitted for bounty #5' });
  });

  it('labels a release/payment with amount and recipient', () => {
    const it_ = buildLifecycleItem(['bounty', 'paid'], [5, B, 30_000_000], base, nameOf)!;
    expect(it_).toMatchObject({ kind: 'paid', label: 'Bounty #5 released — 3 XLM to ScraperBot B' });
  });

  it('labels a refund', () => {
    const it_ = buildLifecycleItem(['bounty', 'refunded'], [5], base, nameOf)!;
    expect(it_).toMatchObject({ kind: 'refunded', label: 'Bounty #5 refunded' });
  });

  it('labels an agent registration', () => {
    const it_ = buildLifecycleItem(['agent', 'register'], A, base, nameOf)!;
    expect(it_).toMatchObject({ kind: 'register', label: 'Agent registered: ResearchAgent A' });
  });

  it('labels a reputation bump', () => {
    const it_ = buildLifecycleItem(['agent', 'paid'], [B, 5_000_000], base, nameOf)!;
    expect(it_).toMatchObject({ kind: 'reputation', label: 'Reputation +0.5 XLM for ScraperBot B' });
  });

  it('falls back to a short address for unknown agents', () => {
    const unknown = 'GCUNKNOWNADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1234';
    const it_ = buildLifecycleItem(['bounty', 'claimed'], [9, unknown], base, nameOf)!;
    expect(it_.label).toContain(shortAddr(unknown));
  });

  it('returns null for events it does not surface', () => {
    expect(buildLifecycleItem(['bounty', 'mystery'], [1], base, nameOf)).toBeNull();
    expect(buildLifecycleItem(['transfer', A, B], 1, base, nameOf)).toBeNull();
    expect(buildLifecycleItem([], null, base, nameOf)).toBeNull();
  });
});

describe('buildTransferItem (x402 hops)', () => {
  it('labels an A→B USDC transfer as an x402 payment', () => {
    const it_ = buildTransferItem(['transfer', A, B, 'USDC:G...'], 500_000, A, base, nameOf);
    expect(it_.kind).toBe('x402');
    expect(it_.label).toBe('ResearchAgent A paid ScraperBot B — 0.05 USDC (x402)');
  });

  it('still labels when the recipient is unknown', () => {
    const it_ = buildTransferItem(['transfer', A, 'GCxUNKNOWN', 'USDC'], 300_000, A, base, nameOf);
    expect(it_.label).toBe('ResearchAgent A paid GCxU…NOWN — 0.03 USDC (x402)');
  });
});

describe('sortAndCap', () => {
  const mk = (ledger: number): ActivityItem => ({
    id: `e${ledger}`,
    ledger,
    txHash: `tx${ledger}`,
    href: '',
    kind: 'created',
    label: '',
  });

  it('orders newest (highest ledger) first', () => {
    const out = sortAndCap([mk(1), mk(50), mk(10)]);
    expect(out.map((i) => i.ledger)).toEqual([50, 10, 1]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 60 }, (_, i) => mk(i));
    expect(sortAndCap(many, 40)).toHaveLength(40);
  });

  it('does not mutate the input array', () => {
    const input = [mk(1), mk(2)];
    sortAndCap(input);
    expect(input.map((i) => i.ledger)).toEqual([1, 2]);
  });
});
