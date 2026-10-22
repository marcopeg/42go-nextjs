import assert from "node:assert/strict";
import test from "node:test";

import { parseFrontmatter } from "../src/42go/utils/frontmatter.ts";

test("plain Markdown and horizontal rules stay intact", () => {
  for (const source of ["", "# Notes\n\n---\nBody\n", "---\nUnclosed frontmatter"]) {
    assert.deepEqual(parseFrontmatter(source), { content: source, data: {} });
  }
});

test("YAML metadata is separated from the exact Markdown body", () => {
  const parsed = parseFrontmatter(
    "---\ntitle: Notes\npublic: false\norder: 3\ntags: [language, learning]\ndescription: |\n  First line\n  Second line\n---\n\n# Body\n\n---\nKeep this rule.\n"
  );
  assert.deepEqual(parsed.data, {
    title: "Notes",
    public: false,
    order: 3,
    tags: ["language", "learning"],
    description: "First line\nSecond line\n",
  });
  assert.equal(parsed.content, "\n# Body\n\n---\nKeep this rule.\n");
});

test("BOMs and Windows line endings preserve the body", () => {
  assert.deepEqual(parseFrontmatter("\uFEFF---\r\ntitle: Notes\r\n---\r\n# Body\r\n"), {
    data: { title: "Notes" },
    content: "# Body\r\n",
  });
});

test("empty frontmatter and JSON mappings are supported", () => {
  assert.deepEqual(parseFrontmatter("---\n---\nBody"), { data: {}, content: "Body" });
  assert.deepEqual(parseFrontmatter('---\n{"title":"Notes","tags":["one"]}\n---\nBody'), {
    data: { title: "Notes", tags: ["one"] },
    content: "Body",
  });
});

test("timestamps and YAML merges retain their existing meaning", () => {
  const parsed = parseFrontmatter(
    "---\ndate: 2026-10-22\ndefaults: &defaults\n  author: Marco\npage:\n  <<: *defaults\n  title: Notes\n---\nBody"
  );
  assert.ok(parsed.data.date instanceof Date);
  assert.equal(parsed.data.date.toISOString(), "2026-10-22T00:00:00.000Z");
  assert.deepEqual(parsed.data.page, { author: "Marco", title: "Notes" });
});

test("invalid YAML and non-mapping metadata fail without evaluating code", () => {
  assert.throws(() => parseFrontmatter("---\ntitle: [unterminated\n---\nBody"));
  for (const metadata of ["plain scalar", "- list entry", "2026-10-22"]) {
    assert.throws(() => parseFrontmatter(`---\n${metadata}\n---\nBody`), /YAML mapping/);
  }
  const source = '---javascript\nthrow new Error("must not execute");\n---\nBody';
  assert.deepEqual(parseFrontmatter(source), { data: {}, content: source });
});

test("excessive YAML alias expansion is rejected", () => {
  const metadata = ["a: &a [one, two, three, four, five, six, seven, eight, nine, ten]"];
  for (const [name, previous] of [["b", "a"], ["c", "b"], ["d", "c"]]) {
    metadata.push(`${name}: &${name} [${Array(10).fill(`*${previous}`).join(", ")}]`);
  }
  assert.throws(() => parseFrontmatter(`---\n${metadata.join("\n")}\n---\nBody`), /alias/i);
});
