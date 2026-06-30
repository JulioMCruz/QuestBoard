/**
 * Seed the board with one bounty per category so every quest-card avatar is on display.
 * Posts 6 real bounties on testnet, signing as POSTER_SECRET. Deadline 7 days (168h).
 *
 * Run: npm run seed   (reads POSTER_SECRET / BOUNTY_FACTORY_ID / SOROBAN_RPC from .env.local)
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { createBounty } from "./bounty.js";

const POSTER_SECRET = process.env.POSTER_SECRET ?? "";
// XLM SAC (native, no trustline) — same token the UI escrows.
const TOKEN_ID =
  process.env.SEED_TOKEN_ID ?? "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const DEADLINE_HOURS = 168; // 7 days
const DECIMALS = 10_000_000; // XLM has 7 decimals

// One per category — the `[qb:<key>]` marker is what the UI reads to show the icon.
const QUESTS: { key: string; title: string; desc: string; xlm: number }[] = [
  { key: "development", title: "Build a dApp", desc: "Build a small decentralized app on Stellar using any web3 stack. Ship the repo plus a short demo video.", xlm: 20 },
  { key: "security", title: "Find the Bug", desc: "Audit our Soroban escrow contract and report a real vulnerability with a reproduction.", xlm: 8 },
  { key: "docs", title: "Write the Docs", desc: "Write a clear integration guide for posting, claiming and releasing bounties.", xlm: 1.5 },
  { key: "design", title: "Design an Asset", desc: "Design a voxel asset for the QuestBoard world — a sprite or a small icon set.", xlm: 5 },
  { key: "qa", title: "Test the Protocol", desc: "Run the full QA flow on testnet and report any issues you find.", xlm: 0.7 },
  { key: "content", title: "Create Content", desc: "Make a short video or thread explaining how agents earn on QuestBoard.", xlm: 2.5 },
];

async function main() {
  if (!POSTER_SECRET) throw new Error("POSTER_SECRET not set in .env.local");
  console.log(`[seed] posting ${QUESTS.length} bounties · deadline ${DEADLINE_HOURS}h · token ${TOKEN_ID.slice(0, 6)}…`);
  for (const q of QUESTS) {
    const description = `${q.desc}\n\n[qb:${q.key}]`;
    const amount = BigInt(Math.round(q.xlm * DECIMALS));
    try {
      const { id, txHash } = await createBounty(
        { title: q.title, description, amount, token: TOKEN_ID, deadlineHours: DEADLINE_HOURS },
        POSTER_SECRET
      );
      console.log(`  ✓ #${id}  ${q.title}  (${q.xlm} XLM, ${q.key})  ${txHash ?? ""}`);
    } catch (e) {
      console.error(`  ✗ ${q.title} failed:`, e instanceof Error ? e.message : e);
    }
  }
  console.log("[seed] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
