import { describe, it, expect } from 'vitest';
import {
  statusLabel,
  statusTone,
  escrowLine,
  formatAmount,
  shortAddr,
  humanError,
} from '../lib/labels';

describe('statusLabel — role-aware, plain language', () => {
  it('tells each role what the status means for them', () => {
    expect(statusLabel('Open', 'agent')).toBe('Available to claim');
    expect(statusLabel('Open', 'poster')).toBe('Waiting for an agent');
    expect(statusLabel('Submitted', 'poster')).toBe('Ready to review');
    expect(statusLabel('Released', 'agent')).toBe('Completed — earned');
    expect(statusLabel('Released', 'poster')).toBe('Completed — paid');
  });
  it('uses neutral public labels', () => {
    expect(statusLabel('Claimed', 'public')).toBe('In progress');
    expect(statusLabel('Refunded', 'public')).toBe('Closed');
  });
});

describe('statusTone', () => {
  it('returns a class string for every status', () => {
    for (const s of ['Open', 'Claimed', 'Submitted', 'Released', 'Refunded'] as const) {
      expect(typeof statusTone(s)).toBe('string');
      expect(statusTone(s).length).toBeGreaterThan(0);
    }
  });
});

describe('escrowLine — "where are my funds"', () => {
  it('reassures while locked and confirms on release/refund', () => {
    expect(escrowLine('Open', '5 XLM')).toMatch(/locked/i);
    expect(escrowLine('Submitted', '5 XLM')).toMatch(/review/i);
    expect(escrowLine('Released', '5 XLM')).toMatch(/sent to the agent/i);
    expect(escrowLine('Refunded', '5 XLM')).toMatch(/returned/i);
  });
});

describe('formatAmount — base units (7 decimals) → label', () => {
  it('formats integers without decimals', () => {
    expect(formatAmount(50_000_000)).toBe('5 XLM');
    expect(formatAmount(10_000_000)).toBe('1 XLM');
  });
  it('formats fractional amounts to 2dp', () => {
    expect(formatAmount(500_000)).toBe('0.05 XLM');
    expect(formatAmount(25_000_000)).toBe('2.50 XLM');
  });
  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0 XLM');
  });
});

describe('shortAddr', () => {
  it('truncates the middle', () => {
    expect(shortAddr('GB5IY6OELAKSTQPE3RCRWW6ZHK2YCQJIVOWBPXGWUPGRQWK6YECONDOE')).toBe(
      'GB5IY6…NDOE'
    );
  });
  it('returns empty string for empty input', () => {
    expect(shortAddr('')).toBe('');
  });
});

describe('humanError — raw chain/wallet errors → friendly text', () => {
  it('maps wallet-not-installed', () => {
    expect(humanError('Freighter not detected')).toMatch(/install/i);
  });
  it('maps user rejection', () => {
    expect(humanError('User rejected the request')).toMatch(/cancelled/i);
  });
  it('maps insufficient balance', () => {
    expect(humanError('insufficient balance')).toMatch(/enough/i);
    expect(humanError('value is not within the allowed range')).toMatch(/enough/i);
  });
  it('maps stale-state races', () => {
    expect(humanError('bounty is not Open')).toMatch(/updated by someone else/i);
  });
  it('passes through unknown errors unchanged', () => {
    expect(humanError('some novel error')).toBe('some novel error');
  });
});
