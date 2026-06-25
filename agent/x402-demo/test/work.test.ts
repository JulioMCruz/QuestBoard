import { describe, it, expect } from "vitest";
import { parseHtml, summarize, decodeEntities, normalizeUrl } from "../src/work.js";

describe("decodeEntities", () => {
  it("decodes common HTML entities", () => {
    expect(decodeEntities("A &amp; B &lt;x&gt; &quot;q&quot; &#39;y&apos; &nbsp;z")).toBe(
      `A & B <x> "q" 'y'  z`
    );
  });
});

describe("normalizeUrl", () => {
  it("prepends https:// when missing", () => {
    expect(normalizeUrl("stellar.org")).toBe("https://stellar.org");
  });
  it("leaves a full URL untouched", () => {
    expect(normalizeUrl("http://x.test/a")).toBe("http://x.test/a");
  });
});

describe("parseHtml", () => {
  const html = `
    <html><head>
      <title>  Hello &amp; World </title>
      <meta name="description" content="A short desc">
      <style>.a{color:red}</style>
    </head><body>
      <script>var x = 1 < 2;</script>
      <h1>Heading</h1><p>Some visible text here.</p>
    </body></html>`;

  it("extracts and decodes the title", () => {
    expect(parseHtml(html).title).toBe("Hello & World");
  });
  it("extracts the meta description", () => {
    expect(parseHtml(html).description).toBe("A short desc");
  });
  it("strips script/style and tags from the excerpt", () => {
    const { excerpt } = parseHtml(html);
    expect(excerpt).toContain("Heading");
    expect(excerpt).toContain("Some visible text here.");
    expect(excerpt).not.toContain("var x");
    expect(excerpt).not.toContain("color:red");
    expect(excerpt).not.toMatch(/<[^>]+>/);
  });
  it("counts words", () => {
    expect(parseHtml(html).words).toBeGreaterThan(2);
  });
  it("falls back to og:description", () => {
    const og = `<title>t</title><meta property="og:description" content="OG desc">`;
    expect(parseHtml(og).description).toBe("OG desc");
  });
});

describe("summarize (extractive)", () => {
  it("returns the input when at or under the sentence cap", () => {
    expect(summarize("One sentence only.", 3)).toBe("One sentence only.");
  });

  it("selects the most term-frequent sentences, in original order", () => {
    const text =
      "Stellar payments settle fast. The weather is nice today maybe. Stellar payments are cheap and fast.";
    const out = summarize(text, 2);
    // The two payments-heavy sentences win; the low-relevance weather sentence loses.
    expect(out).not.toContain("weather");
    // both winners present, in original order
    const i1 = out.indexOf("Stellar payments settle");
    const i2 = out.indexOf("Stellar payments are cheap");
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i2).toBeGreaterThan(i1);
  });

  it("never returns more than maxSentences", () => {
    const text = "A a a. B b b. C c c. D d d. E e e.";
    const out = summarize(text, 2);
    expect((out.match(/[.!?]/g) ?? []).length).toBeLessThanOrEqual(2);
  });
});
