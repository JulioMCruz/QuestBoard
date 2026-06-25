/**
 * Live on-chain activity feed for the dashboard — reads contract events from
 * Soroban RPC so judges can watch the real transactions happen, each linked to
 * Stellar Explorer. Covers the bounty lifecycle + reputation (BountyFactory,
 * AgentRegistry) and the agent-to-agent x402 payments (USDC transfers).
 */

import { rpc, scValToNative, xdr, Address } from '@stellar/stellar-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC ?? 'https://soroban-testnet.stellar.org';
const BF = process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ID ?? '';
const AR = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID ?? '';
const USDC =
  process.env.NEXT_PUBLIC_USDC_TESTNET ?? 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
const EXPLORER_TX = 'https://stellar.expert/explorer/testnet/tx/';

const AGENT_NAMES: Record<string, string> = {};
const named = (addr: string | undefined, name: string) => {
  if (addr) AGENT_NAMES[addr] = name;
};
named(process.env.NEXT_PUBLIC_AGENT_A_ADDRESS, 'ResearchAgent A');
named(process.env.NEXT_PUBLIC_AGENT_B_ADDRESS, 'ScraperBot B');
named(process.env.NEXT_PUBLIC_AGENT_C_ADDRESS, 'SummarizerBot C');

export type ActivityKind =
  | 'created'
  | 'claimed'
  | 'submitted'
  | 'paid'
  | 'refunded'
  | 'register'
  | 'reputation'
  | 'x402';

export interface ActivityItem {
  id: string;
  ledger: number;
  txHash: string;
  href: string;
  kind: ActivityKind;
  label: string;
}

export const shortAddr = (a: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');
const name = (a: string) => AGENT_NAMES[a] ?? shortAddr(a);
export const formatXlm = (base: unknown) => `${Number(base) / 1e7} XLM`;
export const formatUsdc = (base: unknown) => `${(Number(base) / 1e7).toFixed(2)} USDC`;
export const explorerTx = (txHash: string) => EXPLORER_TX + txHash;

export interface ActivityBase {
  id: string;
  ledger: number;
  txHash: string;
  href: string;
}

type NameOf = (addr: string) => string;

/**
 * Pure: turn a decoded BountyFactory/AgentRegistry event (native topics + value)
 * into a labeled activity item, or null if it's not one we surface. Kept free of
 * RPC/XDR so it can be unit-tested directly.
 */
export function buildLifecycleItem(
  topics: unknown[],
  value: any,
  base: ActivityBase,
  nameOf: NameOf = name
): ActivityItem | null {
  const [a, b] = topics;
  const v = value;
  if (a === 'bounty' && b === 'created')
    return { ...base, kind: 'created', label: `Bounty #${v[0]} posted — ${formatXlm(v[2])} locked` };
  if (a === 'bounty' && b === 'claimed')
    return { ...base, kind: 'claimed', label: `Bounty #${v[0]} claimed by ${nameOf(v[1])}` };
  if (a === 'bounty' && b === 'submitted')
    return { ...base, kind: 'submitted', label: `Proof submitted for bounty #${v[0]}` };
  if (a === 'bounty' && b === 'paid')
    return { ...base, kind: 'paid', label: `Bounty #${v[0]} released — ${formatXlm(v[2])} to ${nameOf(v[1])}` };
  if (a === 'bounty' && b === 'refunded')
    return { ...base, kind: 'refunded', label: `Bounty #${v[0]} refunded` };
  if (a === 'agent' && b === 'register')
    return { ...base, kind: 'register', label: `Agent registered: ${nameOf(v)}` };
  if (a === 'agent' && b === 'paid')
    return { ...base, kind: 'reputation', label: `Reputation +${formatXlm(v[1])} for ${nameOf(v[0])}` };
  return null;
}

/** Pure: turn a USDC transfer event into an x402-hop activity item. */
export function buildTransferItem(
  topics: unknown[],
  amount: unknown,
  fromAddr: string,
  base: ActivityBase,
  nameOf: NameOf = name
): ActivityItem {
  const to = String(topics[2] ?? '');
  return { ...base, kind: 'x402', label: `${nameOf(fromAddr)} paid ${nameOf(to)} — ${formatUsdc(amount)} (x402)` };
}

/** Newest first, capped. */
export function sortAndCap(items: ActivityItem[], cap = 40): ActivityItem[] {
  return [...items].sort((x, y) => y.ledger - x.ledger).slice(0, cap);
}

function topicsOf(e: { topic?: unknown[] }): unknown[] {
  return (e.topic ?? []).map((t) => {
    try {
      return scValToNative(t as xdr.ScVal);
    } catch {
      return null;
    }
  });
}
function valueOf(e: { value?: unknown }): unknown {
  try {
    return scValToNative(e.value as xdr.ScVal);
  } catch {
    return null;
  }
}

export async function getActivity(): Promise<ActivityItem[]> {
  if (!BF || !AR) return [];
  const server = new rpc.Server(RPC_URL);
  const latest = (await server.getLatestLedger()).sequence;
  const items: ActivityItem[] = [];

  // --- Bounty lifecycle + reputation events (resilient to RPC retention window) ---
  for (const back of [17000, 8000, 3000]) {
    const startLedger = Math.max(1, latest - back);
    try {
      const resp = await server.getEvents({
        startLedger,
        filters: [{ type: 'contract', contractIds: [BF, AR] }],
        limit: 200,
      });
      for (const e of resp.events as any[]) {
        const t = topicsOf(e);
        const v = valueOf(e);
        const base: ActivityBase = { id: e.id ?? `${e.txHash}:${t.join()}`, ledger: e.ledger, txHash: e.txHash, href: explorerTx(e.txHash) };
        const item = buildLifecycleItem(t, v, base);
        if (item) items.push(item);
      }
      break; // succeeded
    } catch {
      // window too large for the RPC's retention — try a smaller one
    }
  }

  // --- Agent-to-agent x402 payments: USDC transfers from the orchestrator ---
  const A = process.env.NEXT_PUBLIC_AGENT_A_ADDRESS;
  if (A) {
    for (const back of [17000, 8000, 3000]) {
      const startLedger = Math.max(1, latest - back);
      try {
        const transferSym = xdr.ScVal.scvSymbol('transfer').toXDR('base64');
        const fromA = Address.fromString(A).toScVal().toXDR('base64');
        const resp = await server.getEvents({
          startLedger,
          filters: [{ type: 'contract', contractIds: [USDC], topics: [[transferSym, fromA, '*', '*']] }],
          limit: 50,
        });
        for (const e of resp.events as any[]) {
          const t = topicsOf(e);
          const amount = valueOf(e);
          const base: ActivityBase = { id: e.id ?? e.txHash, ledger: e.ledger, txHash: e.txHash, href: explorerTx(e.txHash) };
          items.push(buildTransferItem(t, amount, A, base));
        }
        break;
      } catch {
        // ignore — x402 layer is best-effort
      }
    }
  }

  return sortAndCap(items);
}
