/**
 * The actual "work" the demo agents do, split out from the HTTP layer so it can
 * be unit-tested without a network or the x402 paywall:
 *   - parseHtml: pure HTML → {title, description, excerpt, words}
 *   - scrapeUrl: fetch + parseHtml (Agent B)
 *   - summarize: extractive term-frequency summarization (Agent C)
 */

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export interface Parsed {
  title: string;
  description: string;
  words: number;
  excerpt: string;
}

/** Pure: extract title / meta description / visible text from an HTML string. */
export function parseHtml(html: string): Parsed {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const description = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    ""
  ).trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    title: decodeEntities(title),
    description: decodeEntities(description),
    words: text ? text.split(" ").length : 0,
    excerpt: decodeEntities(text.slice(0, 500)),
  };
}

export function normalizeUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Agent B: fetch a URL (8s timeout) and parse it. */
export async function scrapeUrl(raw: string): Promise<Record<string, unknown>> {
  const url = normalizeUrl(raw);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "QuestBoard-AgentB/0.1" } });
    const html = await r.text();
    return { url, status: r.status, ...parseHtml(html) };
  } catch (e) {
    return { url, error: e instanceof Error ? e.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

const STOP = new Set(
  "the a an and or of to in for on is are be was were with that this as at by from it its their our your you we they he she".split(" ")
);

/** Agent C: extractive summarization — rank sentences by term frequency (minus stopwords). */
export function summarize(text: string, maxSentences = 3): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? (clean ? [clean] : []);
  if (sentences.length <= maxSentences) return sentences.join(" ");
  const freq: Record<string, number> = {};
  for (const w of clean.toLowerCase().match(/[a-z]{3,}/g) ?? []) if (!STOP.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  return sentences
    .map((s, i) => {
      const words = s.toLowerCase().match(/[a-z]{3,}/g) ?? [];
      const score = words.reduce((a, w) => a + (freq[w] ?? 0), 0) / Math.max(1, words.length);
      return { s, i, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(" ");
}
