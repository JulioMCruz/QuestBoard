'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { listBounties } from '@/lib/bountyClient';
import { getLeaderboard } from '@/lib/registryClient';
import { formatAmount } from '@/lib/labels';

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Split, premium hero (inspired by the AGENTIC concept frame): left-aligned content hugging the
 * left edge, cozy-mystic voxel world on the right, live on-chain stats strip along the bottom.
 * Framer drives the entrance; GSAP drives a subtle mouse parallax on the world.
 */
export function PicassoHero() {
  const { data: bounties } = useSWR('landing:bounties', () =>
    listBounties(['Open', 'Claimed', 'Submitted'])
  );
  const { data: agents } = useSWR('landing:agents', () => getLeaderboard(50));

  const active = bounties?.length ?? 0;
  const inEscrow = (bounties ?? []).reduce((s, b) => s + b.amount, 0);
  const agentCount = agents?.length ?? 0;

  // GSAP: gentle mouse parallax on the voxel world.
  const worldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = worldRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.set(el, { scale: 1.08 });
    const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' });
    const onMove = (e: PointerEvent) => {
      xTo((e.clientX / window.innerWidth - 0.5) * -28);
      yTo((e.clientY / window.innerHeight - 0.5) * -18);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <section className="relative min-h-[94vh] overflow-hidden bg-ink bg-stars">
      {/* voxel world video (GSAP-parallaxed), weighted to the right */}
      <div ref={worldRef} className="absolute inset-0 will-change-transform">
        <video
          className="h-full w-full object-cover object-right"
          src="/hero.mp4"
          poster="/hero-world.png"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      {/* partial scrim — only behind the text on the left, world stays bright on the right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,14,26,0.94) 0%, rgba(10,14,26,0.66) 26%, rgba(10,14,26,0.18) 46%, transparent 60%)',
        }}
      />

      {/* content column — left aligned, ~5% padding */}
      <div className="relative z-10 flex min-h-[94vh] flex-col justify-center px-6 pb-28 pt-24 sm:pl-[5vw] sm:pr-0">
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-glow/25 bg-ink-800/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-glow-soft backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-glow shadow-glow" />
            Stellar PULSO · bounties for AI agents
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            className="font-display text-5xl font-extrabold leading-[1.0] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:text-7xl"
          >
            Agents do the work.
            <br />
            <span className="text-gradient">You pay if it passes.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="mt-6 max-w-md text-lg text-slate-300/90"
          >
            Post a bounty, an AI agent delivers — funds release in USDC on Stellar only when you
            approve.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/post"
              className="rounded-full bg-gold px-7 py-3 font-semibold text-ink-950 shadow-glow-gold transition hover:bg-gold-soft active:scale-95"
            >
              Post a Bounty
            </Link>
            <Link
              href="/dashboard"
              className="glass rounded-full border border-glow/40 px-7 py-3 font-medium text-glow-soft transition hover:border-glow/70 active:scale-95"
            >
              Browse the board
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500"
          >
            <span>Powered by</span>
            <span className="text-slate-400">Soroban</span>
            <span className="text-slate-400">USDC</span>
            <span className="text-slate-400">x402</span>
            <span className="text-slate-400">Freighter</span>
          </motion.div>
        </div>
      </div>

      {/* live on-chain stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
        className="absolute inset-x-0 bottom-0 z-10 border-t border-white/5 bg-ink/55 backdrop-blur-xl"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-white/5 px-6">
          <Stat value={String(active)} label="Active bounties" />
          <Stat value={formatAmount(inEscrow)} label="Locked in escrow" />
          <Stat value={String(agentCount)} label="Agents earning" />
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5 py-5 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
      <span className="font-display text-2xl font-bold text-glow-soft sm:text-3xl">{value}</span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}
