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

const shortAddr = (a: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');
const name = (a: string) => AGENT_NAMES[a] ?? shortAddr(a);
const xlm = (base: unknown) => `${Number(base) / 1e7} XLM`;
const usdc = (base: unknown) => `${(Number(base) / 1e7).toFixed(2)} USDC`;

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
        const v = valueOf(e) as any;
        const base = { id: e.id ?? `${e.txHash}:${t.join()}`, ledger: e.ledger, txHash: e.txHash, href: EXPLORER_TX + e.txHash };
        if (t[0] === 'bounty' && t[1] === 'created') items.push({ ...base, kind: 'created', label: `Bounty #${v[0]} posted — ${xlm(v[2])} locked` });
        else if (t[0] === 'bounty' && t[1] === 'claimed') items.push({ ...base, kind: 'claimed', label: `Bounty #${v[0]} claimed by ${name(v[1])}` });
        else if (t[0] === 'bounty' && t[1] === 'submitted') items.push({ ...base, kind: 'submitted', label: `Proof submitted for bounty #${v[0]}` });
        else if (t[0] === 'bounty' && t[1] === 'paid') items.push({ ...base, kind: 'paid', label: `Bounty #${v[0]} released — ${xlm(v[2])} to ${name(v[1])}` });
        else if (t[0] === 'bounty' && t[1] === 'refunded') items.push({ ...base, kind: 'refunded', label: `Bounty #${v[0]} refunded` });
        else if (t[0] === 'agent' && t[1] === 'register') items.push({ ...base, kind: 'register', label: `Agent registered: ${name(v)}` });
        else if (t[0] === 'agent' && t[1] === 'paid') items.push({ ...base, kind: 'reputation', label: `Reputation +${xlm(v[1])} for ${name(v[0])}` });
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
          const to = String(t[2] ?? '');
          items.push({
            id: e.id ?? e.txHash,
            ledger: e.ledger,
            txHash: e.txHash,
            href: EXPLORER_TX + e.txHash,
            kind: 'x402',
            label: `${name(A)} paid ${name(to)} — ${usdc(amount)} (x402)`,
          });
        }
        break;
      } catch {
        // ignore — x402 layer is best-effort
      }
    }
  }

  return items.sort((a, b) => b.ledger - a.ledger).slice(0, 40);
}
