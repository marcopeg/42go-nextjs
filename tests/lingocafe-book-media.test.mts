import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { getReaderCoverOverride, readerBookAllowedElements } from "../src/lib/lingocafe/book-presentation.ts";

describe("reader book media", () => {
  it("preserves actual figures and bibliography links and lists without raw HTML", () => {
    const html = renderToStaticMarkup(createElement(ReactMarkdown, {
      allowedElements: readerBookAllowedElements, skipHtml: true,
    }, '### Figure\n\n![Sweden map](/images/map.png)\n\n- [SCB](https://www.scb.se/)\n- [UHR](https://www.uhr.se/)\n\n<script>alert(1)</script>'));
    assert.match(html, /<img[^>]+src="\/images\/map.png"[^>]+alt="Sweden map"/);
    assert.match(html, /<ul>/);
    assert.equal((html.match(/<li>/g) || []).length, 2);
    assert.match(html, /href="https:\/\/www.scb.se\/"/);
    assert.doesNotMatch(html, /<script|alert\(1\)/);
  });
  it("accepts a per-book local cover and leaves absent overrides on the old fallback", () => {
    assert.equal(getReaderCoverOverride({ cover_url: '/images/book.png' }), '/images/book.png');
    assert.equal(getReaderCoverOverride({ cover_url: 'https://assets.example/cover.png' }), 'https://assets.example/cover.png');
    assert.equal(getReaderCoverOverride({}), null);
    assert.equal(getReaderCoverOverride(null), null);
  });
  it("rejects protocol-relative, executable and credential-bearing cover URLs", () => {
    for (const value of ['//evil.example/x', 'javascript:alert(1)', 'data:image/png;base64,x', 'https://user:secret@example.com/a', '/\\evil.example/a', '/image\n.png']) {
      assert.equal(getReaderCoverOverride({ cover_url: value }), null);
    }
  });
});
