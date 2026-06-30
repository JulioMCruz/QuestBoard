'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/lib/WalletContext';
import {
  listBounties,
  createBounty,
  claimBounty,
  submitProof,
  releasePayment,
} from '@/lib/bountyClient';
import { getLeaderboard } from '@/lib/registryClient';
import { formatAmount, statusLabel, shortAddr, humanError } from '@/lib/labels';
import type { BountyStatus } from '@/lib/bindings/bountyBindings';

type Kind = 'cmd' | 'out' | 'ok' | 'err' | 'sys';
interface Line {
  kind: Kind;
  text: string;
}

const KIND_CLS: Record<Kind, string> = {
  cmd: 'text-glow-soft',
  out: 'text-slate-300',
  ok: 'text-emerald-300',
  err: 'text-red-400',
  sys: 'text-slate-500',
};

const HELP = [
  '/questboard list [status]         open (or filtered) bounties',
  '/questboard post "<title>" <amt>  create a bounty (locks the reward)',
  '/questboard claim <id>            claim as an agent',
  '/questboard submit <id> <proof>   submit proof of work',
  '/questboard release <id>          release payment to the agent',
  '/agents [top]                     reputation leaderboard',
  '/my                               my bounties (poster or agent)',
  '/help · /clear',
];

const STATUSES = ['Open', 'Claimed', 'Submitted', 'Released', 'Refunded'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function parsePost(rest: string[]) {
  if (rest.length < 1) return { title: '', amount: NaN };
  const amount = parseFloat(rest[rest.length - 1]);
  const title = rest.slice(0, -1).join(' ').trim().replace(/^["'](.*)["']$/, '$1');
  return { title, amount };
}

/** Interactive Hermes console — the same /questboard slash commands as the chat agent, run live. */
export function HermesConsole() {
  const { address, connected, connect } = useWallet();
  const [lines, setLines] = useState<Line[]>([
    { kind: 'sys', text: 'QuestBoard · Hermes console — type /help. Commands run live against Stellar testnet.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const push = (...ls: Line[]) => setLines((p) => [...p, ...ls]);

  async function requireWallet(): Promise<string> {
    if (connected && address) return address;
    await connect();
    throw new Error('Connect your wallet, then run the command again.');
  }

  function num(s: string | undefined): number {
    const n = parseInt(s ?? '', 10);
    if (Number.isNaN(n)) throw new Error('Expected a bounty id (a number).');
    return n;
  }

  async function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    push({ kind: 'cmd', text: `❯ ${cmd}` });
    setHistory((h) => [...h, cmd]);
    setHIdx(-1);
    setInput('');

    if (cmd === '/clear') return setLines([]);
    if (cmd === '/help') return push(...HELP.map((text) => ({ kind: 'out' as const, text })));

    setBusy(true);
    try {
      const [a, b, ...rest] = cmd.split(/\s+/);

      if (a === '/questboard' && b === 'list') {
        const s = rest[0] ? cap(rest[0]) : null;
        const wanted = (s && STATUSES.includes(s) ? [s] : ['Open', 'Claimed', 'Submitted']) as BountyStatus['tag'][];
        const bs = await listBounties(wanted);
        if (!bs.length) push({ kind: 'out', text: 'No bounties found.' });
        else push(...bs.slice(0, 25).map((x) => ({ kind: 'out' as const, text: `#${x.id}  ${x.title} — ${formatAmount(x.amount)}  [${x.status}]` })));
      } else if (a === '/questboard' && b === 'post') {
        const me = await requireWallet();
        const { title, amount } = parsePost(rest);
        if (!title || !(amount > 0)) throw new Error('Usage: /questboard post "<title>" <amount>');
        push({ kind: 'out', text: `Posting "${title}" (${amount} XLM locked in escrow)…` });
        const { id, txHash } = await createBounty(me, { title, description: 'Posted via the Hermes console.', amount, deadlineHours: 24 });
        push({ kind: 'ok', text: `Bounty #${id} posted. Status: Open. Deadline: 24h.${txHash ? `  tx ${txHash.slice(0, 8)}…` : ''}` });
      } else if (a === '/questboard' && b === 'claim') {
        const me = await requireWallet();
        const id = num(rest[0]);
        const tx = await claimBounty(me, id);
        push({ kind: 'ok', text: `Claimed bounty #${id} — you're on it.${tx ? `  tx ${tx.slice(0, 8)}…` : ''}` });
      } else if (a === '/questboard' && b === 'submit') {
        const me = await requireWallet();
        const id = num(rest[0]);
        const proof = rest.slice(1).join(' ');
        if (!proof) throw new Error('Usage: /questboard submit <id> <proof>');
        const tx = await submitProof(me, id, proof);
        push({ kind: 'ok', text: `Proof submitted for #${id} — awaiting approval.${tx ? `  tx ${tx.slice(0, 8)}…` : ''}` });
      } else if (a === '/questboard' && b === 'release') {
        const me = await requireWallet();
        const id = num(rest[0]);
        const tx = await releasePayment(me, id);
        push({ kind: 'ok', text: `Payment released for #${id}. The agent's reputation will update.${tx ? `  tx ${tx.slice(0, 8)}…` : ''}` });
      } else if (a === '/agents') {
        const ags = await getLeaderboard(10);
        if (!ags.length) push({ kind: 'out', text: 'No agents registered yet.' });
        else push(...ags.map((g, i) => ({ kind: 'out' as const, text: `#${i + 1}  ${g.name}  ${formatAmount(g.score)}  · ${g.bountiesDone} bounties` })));
      } else if (a === '/my') {
        const me = await requireWallet();
        const mine = (await listBounties()).filter((x) => x.poster === me || x.agent === me);
        if (!mine.length) push({ kind: 'out', text: 'You have no bounties yet.' });
        else push(...mine.map((x) => ({ kind: 'out' as const, text: `#${x.id}  ${x.title} — ${formatAmount(x.amount)}  [${statusLabel(x.status, x.poster === me ? 'poster' : 'agent')}]` })));
      } else {
        push({ kind: 'err', text: `Unknown command: ${a}. Type /help.` });
      }
    } catch (e) {
      push({ kind: 'err', text: humanError(e instanceof Error ? e.message : String(e)) });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHIdx((i) => {
        const ni = i < 0 ? history.length - 1 : Math.max(0, i - 1);
        if (history[ni] !== undefined) setInput(history[ni]);
        return ni;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHIdx((i) => {
        const ni = i < 0 ? -1 : i + 1;
        if (ni >= history.length) { setInput(''); return -1; }
        setInput(history[ni]); return ni;
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950/80 shadow-card ring-1 ring-inset ring-white/5">
      <div className="flex items-center gap-2 border-b border-white/5 bg-ink-900/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 font-mono text-xs text-slate-400">hermes · /questboard</span>
        <span className="ml-auto font-mono text-[11px] text-slate-500">
          {connected ? shortAddr(address!) : 'not connected'}
        </span>
      </div>

      <div className="h-72 space-y-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        {lines.map((l, i) => (
          <p key={i} className={`whitespace-pre-wrap ${KIND_CLS[l.kind]}`}>{l.text}</p>
        ))}
        {busy && <p className="animate-pulse text-slate-500">…running on testnet…</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (!busy) run(input); }}
        className="flex items-center gap-2 border-t border-white/5 bg-ink-900/40 px-4 py-2.5 font-mono text-sm"
      >
        <span className="shrink-0 text-glow-soft">{connected ? shortAddr(address!) : 'guest'} ❯</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          spellCheck={false}
          autoComplete="off"
          placeholder="/questboard list"
          className="w-full bg-transparent text-white placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
        />
      </form>
    </div>
  );
}
