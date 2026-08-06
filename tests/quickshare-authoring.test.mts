import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { quickShareResourceCatalog } from "../src/lib/quickshare/resource-catalog.ts";
import {
  compileQuickShareMarkdown,
  compileQuickShareText,
} from "../src/lib/quickshare/server/text-markdown-compiler-core.ts";
import {
  compileQuickShareWebPage,
  parseQuickShareWebPageDraft,
} from "../src/lib/quickshare/server/web-page-compiler-core.ts";
import { buildQuickShareWebPagePreview } from "../src/app/(app)/(quickshare)/quickshare/_lib/web-page-preview.ts";
import { validateQuickShareReleaseBundle } from "../src/lib/quickshare/server/release-bundle.ts";

describe("QuickShare text and Markdown authoring", () => {
  it("exposes every implemented creation capability", () => {
    assert.deepEqual(quickShareResourceCatalog.map(({ id }) => id), ["text", "markdown", "web-page", "template"]);
  });

  it("compiles text as an exact plain-text entry", () => {
    const source = "<script>alert(1)</script>\nplain";
    const compiled = compileQuickShareText({ title: "<title>", content: { source } });
    assert.equal(compiled.files["index.txt"].toString(), source);
    const checked = validateQuickShareReleaseBundle(compiled);
    assert.equal(checked.manifest.entry, "index.txt");
    assert.equal(checked.manifest.files[0]?.contentType, "text/plain; charset=utf-8");
  });

  it("renders Markdown without accepting raw HTML and leaves source input untouched", () => {
    const draft = { source: "# Hello\n\n<script>alert(1)</script>\n\n[link](https://example.com)" };
    const compiled = compileQuickShareMarkdown({ title: "Markdown", content: draft });
    const html = compiled.files["index.html"].toString();
    assert.match(html, /<h1>Hello<\/h1>/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.equal(draft.source, "# Hello\n\n<script>alert(1)</script>\n\n[link](https://example.com)");
  });

  it("locks compiler input to the persisted draft revision and serializes destructive lifecycle work", async () => {
    const [publication, route, migration] = await Promise.all([
      readFile("src/lib/quickshare/server/publication-service.ts", "utf8"),
      readFile("src/app/api/(quickshare)/quickshare/[resourceId]/route.ts", "utf8"),
      readFile("knex/migrations/20260801180000_quickshare_yw90_authoring.js", "utf8"),
    ]);
    assert.match(publication, /forUpdate\(\)/);
    assert.match(publication, /expectedDraftRevision/);
    assert.match(publication, /hydrateQuickShareDraftContent/);
    assert.match(publication, /published_delete_confirmation_required/);
    assert.match(route, /confirmed: z\.literal\(true\)/);
    assert.match(migration, /ever_published/);
  });

  it("compiles a deterministic self-contained web page with hashed CSS, JavaScript, and managed assets", () => {
    const content = {
      html: '<main><img src="assets/logo.png"><h1>Page</h1></main>',
      css: 'main { background: url("assets/logo.png"); }',
      javascript: 'document.querySelector("h1")?.setAttribute("data-ready", "yes");',
      assets: [{ path: "assets/logo.png", contentType: "image/png", data: Buffer.from("not-a-real-png").toString("base64") }],
    };
    const compiled = compileQuickShareWebPage({ title: "Page", content });
    const paths = compiled.manifest.files.map((file) => file.path);
    const html = compiled.files["index.html"].toString();
    assert.equal(validateQuickShareReleaseBundle(compiled).manifest.entry, "index.html");
    assert.equal(paths.filter((path) => path.endsWith(".css")).length, 1);
    assert.equal(paths.filter((path) => path.endsWith(".js")).length, 1);
    assert.equal(paths.filter((path) => path.endsWith(".png")).length, 1);
    assert.match(html, /assets\/page\.[a-f0-9]{16}\.css/);
    assert.match(html, /assets\/page\.[a-f0-9]{16}\.js/);
    assert.match(html, /assets\/logo\.[a-f0-9]{16}\.png/);
    assert.equal(JSON.stringify(content), JSON.stringify(parseQuickShareWebPageDraft(content)));
  });

  it("fails unsupported transforms and malformed managed assets before a release can replace output", () => {
    const base = { html: "<main>hello</main>", css: "", javascript: "", assets: [] };
    assert.throws(() => compileQuickShareWebPage({ title: "Page", content: { ...base, javascript: 'import x from "package";' } }), (error: unknown) => error instanceof Error && "location" in error && (error as { location?: { panel: string; line: number; column: number } }).location?.panel === "javascript");
    assert.throws(() => compileQuickShareWebPage({ title: "Page", content: { ...base, javascript: "interface Page {}" } }), { name: "QuickShareCompilationError" });
    assert.throws(() => compileQuickShareWebPage({ title: "Page", content: { ...base, css: '@import "package";' } }), { name: "QuickShareCompilationError" });
    assert.throws(() => compileQuickShareWebPage({ title: "Page", content: { ...base, html: "<base href=https://example.com>" } }), { name: "QuickShareCompilationError" });
    assert.throws(() => compileQuickShareWebPage({ title: "Page", content: { ...base, html: '<img srcset="https://example.com/a.png 1x">' } }), { name: "QuickShareCompilationError" });
    assert.throws(() => compileQuickShareWebPage({ title: "Page", content: { ...base, html: '<img src="assets/missing.png">' } }), (error: unknown) => error instanceof Error && "location" in error && (error as { location?: { panel: string; line: number; column: number } }).location?.panel === "html");
    assert.throws(() => parseQuickShareWebPageDraft({ ...base, assets: [{ path: "../secret", contentType: "image/png", data: "" }] }), { name: "QuickShareCompilationError" });
  });

  it("places preview policy before every authored head child", () => {
    const preview = buildQuickShareWebPagePreview({ html: "<html><head><script>window.shouldNotLoad = true</script></head><body>safe</body></html>", css: "", javascript: "", assets: [] });
    assert.ok(preview.indexOf("Content-Security-Policy") < preview.indexOf("window.shouldNotLoad"));
    assert.match(preview, /connect-src 'none'/);
  });

  it("keeps executable preview opaque to the authenticated editor", async () => {
    const editor = await readFile(
      "src/app/(app)/(quickshare)/quickshare/_components/QuickShareHome.tsx",
      "utf8"
    );
    assert.match(editor, /sandbox="allow-scripts"/);
    assert.doesNotMatch(editor, /allow-same-origin/);
    assert.match(editor, /referrerPolicy="no-referrer"/);
  });
});
