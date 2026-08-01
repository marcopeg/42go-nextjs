import { createHash } from "node:crypto";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

import { QUICKSHARE_RELEASE_MANIFEST_VERSION, type QuickShareReleaseBundle } from "./release-bundle.ts";

export type QuickShareTextDraft = { source: string };

export class QuickShareCompilationError extends Error {
  public readonly code: string;
  public readonly location?: { panel: "html" | "css" | "javascript"; line: number; column: number };

  constructor(code: string, message: string, location?: { panel: "html" | "css" | "javascript"; line: number; column: number }) { super(message); this.code = code; this.location = location; this.name = "QuickShareCompilationError"; }
}

const documentShell = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>body{max-width:48rem;margin:0 auto;padding:2rem;font:16px/1.6 system-ui,sans-serif;color:#18181b}pre{white-space:pre-wrap;word-break:break-word}a{color:#166534}</style></head><body><main>${body}</main></body></html>`;

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const readDraft = (content: unknown): QuickShareTextDraft => {
  if (!content || typeof content !== "object" || Array.isArray(content) || typeof (content as { source?: unknown }).source !== "string") throw new QuickShareCompilationError("invalid_draft_source", "This draft does not contain valid text source.");
  const source = (content as { source: string }).source;
  if (source.length > 500_000) throw new QuickShareCompilationError("draft_too_large", "Draft source must be 500,000 characters or less.");
  return { source };
};

const bundle = (
  path: 'index.html' | 'index.txt',
  contentType: 'text/html; charset=utf-8' | 'text/plain; charset=utf-8',
  source: string
): QuickShareReleaseBundle => {
  const entry = Buffer.from(source, 'utf8');
  return {
    manifest: {
      version: QUICKSHARE_RELEASE_MANIFEST_VERSION,
      entry: path,
      files: [
        {
          path,
          contentType,
          sha256: createHash('sha256').update(entry).digest('hex'),
          byteSize: entry.byteLength,
        },
      ],
    },
    files: { [path]: entry },
  };
};

export const compileQuickShareText = (input: { title: string; content: unknown }) => {
  const draft = readDraft(input.content);
  return bundle('index.txt', 'text/plain; charset=utf-8', draft.source);
};

export const compileQuickShareMarkdown = (input: { title: string; content: unknown }) => {
  const draft = readDraft(input.content);
  // Raw HTML is not parsed without remark-rehype's allowDangerousHtml option.
  // Sanitization is deliberate defense in depth for generated HTML.
  const rendered = String(unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize).use(rehypeStringify).processSync(draft.source));
  return bundle('index.html', 'text/html; charset=utf-8', documentShell(input.title, rendered));
};

export const compileQuickShareTextOrMarkdown = (input: { type: string; title: string; content: unknown }) => {
  if (input.type === "text") return compileQuickShareText(input);
  if (input.type === "markdown") return compileQuickShareMarkdown(input);
  throw new QuickShareCompilationError("publisher_not_available", "This share type cannot be published yet.");
};
