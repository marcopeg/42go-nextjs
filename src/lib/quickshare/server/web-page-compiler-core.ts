import { createHash } from "node:crypto";
import path from "node:path";
import { Script } from "node:vm";

import {
  QUICKSHARE_RELEASE_MANIFEST_VERSION,
  type QuickShareReleaseBundle,
  type QuickShareReleaseManifest,
} from "./release-bundle.ts";
import { QuickShareCompilationError } from "./text-markdown-compiler-core.ts";

export const quickShareWebPageLimits = {
  htmlCharacters: 200_000,
  cssCharacters: 200_000,
  javascriptCharacters: 300_000,
  assetCount: 20,
  assetBytes: 2 * 1024 * 1024,
  totalAssetBytes: 8 * 1024 * 1024,
} as const;

const assetPathPattern = /^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const quickShareWebPageBase64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
export const quickShareWebPageAssetContentTypes = [
  "application/json",
  "application/octet-stream",
  "application/pdf",
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain; charset=utf-8",
] as const;

const supportedAssetContentTypes = new Set<string>(quickShareWebPageAssetContentTypes);

export type QuickShareWebPageAsset = {
  path: string;
  contentType: string;
  data: string;
};

export type QuickShareWebPageDraft = {
  html: string;
  css: string;
  javascript: string;
  assets: QuickShareWebPageAsset[];
};

export const createQuickShareWebPageDraft = (): QuickShareWebPageDraft => ({
  html: "<main>\n  <h1>Hello, QuickShare.</h1>\n  <p>Publish this page when it is ready.</p>\n</main>",
  css: "body { margin: 0; padding: 2rem; font: 16px/1.5 system-ui, sans-serif; }\nmain { max-width: 48rem; margin: 0 auto; }",
  javascript: "",
  assets: [],
});

const sourceLocation = (panel: "html" | "css" | "javascript", source: string, offset: number) => {
  const before = source.slice(0, Math.max(0, offset));
  const line = before.split("\n").length;
  return { panel, line, column: before.length - before.lastIndexOf("\n") };
};

const fail = (code: string, message: string, location?: { panel: "html" | "css" | "javascript"; line: number; column: number }): never => {
  throw new QuickShareCompilationError(code, message, location);
};

const parseString = (value: unknown, key: "html" | "css" | "javascript", max: number) => {
  if (typeof value !== "string") fail("invalid_web_page_draft", `Web page ${key} must be text.`);
  const text = value as string;
  if (text.length > max) fail("web_page_source_too_large", `Web page ${key} exceeds its v1 size limit.`);
  return text;
};

const decodeAsset = (asset: QuickShareWebPageAsset) => {
  if (!assetPathPattern.test(asset.path)) fail("invalid_managed_asset_path", "Managed asset paths must use assets/<safe-file-name>.");
  if (!supportedAssetContentTypes.has(asset.contentType)) fail("unsupported_managed_asset_type", `Managed asset ${asset.path} has an unsupported content type.`);
  if (!quickShareWebPageBase64Pattern.test(asset.data)) fail("invalid_managed_asset_data", `Managed asset ${asset.path} is not valid base64.`);
  const bytes = Buffer.from(asset.data, "base64");
  if (bytes.byteLength > quickShareWebPageLimits.assetBytes) fail("managed_asset_too_large", `Managed asset ${asset.path} exceeds the v1 size limit.`);
  return bytes;
};

export const parseQuickShareWebPageDraft = (content: unknown): QuickShareWebPageDraft => {
  if (!content || typeof content !== "object" || Array.isArray(content)) fail("invalid_web_page_draft", "This share does not contain a valid web-page draft.");
  const value = content as Partial<QuickShareWebPageDraft>;
  const html = parseString(value.html, "html", quickShareWebPageLimits.htmlCharacters);
  const css = parseString(value.css, "css", quickShareWebPageLimits.cssCharacters);
  const javascript = parseString(value.javascript, "javascript", quickShareWebPageLimits.javascriptCharacters);
  if (!Array.isArray(value.assets)) fail("invalid_web_page_assets", "Managed assets must be a list.");
  const rawAssets = value.assets as unknown[];
  if (rawAssets.length > quickShareWebPageLimits.assetCount) fail("too_many_managed_assets", "This web page has too many managed assets for v1.");
  const paths = new Set<string>();
  let totalBytes = 0;
  const assets: QuickShareWebPageAsset[] = rawAssets.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("invalid_managed_asset", "A managed asset is invalid.");
    const asset = raw as QuickShareWebPageAsset;
    if (typeof asset.path !== "string" || typeof asset.contentType !== "string" || typeof asset.data !== "string") fail("invalid_managed_asset", "A managed asset is incomplete.");
    if (paths.has(asset.path)) fail("duplicate_managed_asset", `Managed asset ${asset.path} is listed more than once.`);
    paths.add(asset.path);
    const bytes = decodeAsset(asset);
    totalBytes += bytes.byteLength;
    if (totalBytes > quickShareWebPageLimits.totalAssetBytes) fail("managed_assets_too_large", "Managed assets exceed the total v1 size limit.");
    return { path: asset.path as string, contentType: asset.contentType as string, data: asset.data as string };
  });
  return { html, css, javascript, assets };
};

const sha256 = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const isExternal = (value: string) => value.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(value);

const unsupportedSourceSyntax = (draft: QuickShareWebPageDraft) => {
  const scriptSource = /<script\b[^>]*\bsrc\s*=/i.exec(draft.html);
  if (scriptSource) fail("external_script_not_supported", "Put browser JavaScript in the JavaScript panel; script src is not supported in v1.", sourceLocation("html", draft.html, scriptSource.index));
  const inlineStyle = /<style\b/i.exec(draft.html);
  if (inlineStyle) fail("inline_style_not_supported", "Put styles in the CSS panel; inline style blocks are not supported in v1.", sourceLocation("html", draft.html, inlineStyle.index));
  const base = /<base\b/i.exec(draft.html);
  if (base) fail("base_element_not_supported", "HTML base elements are outside the self-contained QuickShare v1 bundle.", sourceLocation("html", draft.html, base.index));
  const inlineStyleAttribute = /\bstyle\s*=/i.exec(draft.html);
  if (inlineStyleAttribute) fail("inline_style_not_supported", "Put styles in the CSS panel; inline style attributes are not supported in v1.", sourceLocation("html", draft.html, inlineStyleAttribute.index));
  const cssProcessing = /^\s*@import\b|@(?:mixin|include|use|forward)\b|\$[A-Za-z_-]/im.exec(draft.css);
  if (cssProcessing) fail("css_processing_not_supported", "CSS imports and CSS preprocessing are outside QuickShare v1.", sourceLocation("css", draft.css, cssProcessing.index));
  const packageImport = /^\s*(?:import\b|export\b)|\bimport\s*\(|\brequire\s*\(/m.exec(draft.javascript);
  if (packageImport) fail("package_import_not_supported", "JavaScript package imports and dependency bundling are outside QuickShare v1.", sourceLocation("javascript", draft.javascript, packageImport.index));
  const typeScript = /^\s*(?:interface\b|type\s+[A-Za-z_$][\w$]*\s*=|enum\b|namespace\b|declare\b)/m.exec(draft.javascript);
  if (typeScript) fail("typescript_not_supported", "TypeScript is outside QuickShare v1; write browser JavaScript instead.", sourceLocation("javascript", draft.javascript, typeScript.index));
  try {
    // Parse only. The server never evaluates authored JavaScript.
    new Script(draft.javascript, { filename: "quickshare-page.js" });
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/^quickshare-page\.js:\d+\s*/, "") : "Invalid browser JavaScript.";
    fail("javascript_syntax_error", message);
  }
};

const assetPathFor = (asset: QuickShareWebPageAsset, bytes: Buffer) => {
  const extension = path.posix.extname(asset.path).toLowerCase();
  const name = path.posix.basename(asset.path, extension).replace(/[^A-Za-z0-9_-]/g, "-") || "asset";
  return `assets/${name}.${sha256(bytes).slice(0, 16)}${extension}`;
};

const assertAssetReference = (raw: string, source: string, panel: "html" | "css", offset: number, assetPaths: ReadonlySet<string>) => {
  if (!raw || raw.startsWith("#") || raw.startsWith("data:")) return;
  if (isExternal(raw)) fail("external_asset_not_supported", "External assets are outside the self-contained QuickShare v1 bundle.", sourceLocation(panel, source, offset));
  const pathname = raw.split(/[?#]/, 1)[0].replace(/^\.\//, "");
  if (!assetPaths.has(pathname)) fail("unknown_managed_asset", `The page references ${pathname}, but it is not a managed asset.`, sourceLocation(panel, source, offset));
};

const assetReferences = (source: string, kind: "html" | "css", assetPaths: ReadonlySet<string>) => {
  const references = new Set<string>();
  const pattern = kind === "css" ? /url\(\s*["']?([^"')]+)["']?\s*\)/gi : /<(?:img|source|video|audio|link)\b[^>]*\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi;
  for (const match of source.matchAll(pattern)) {
    const raw = match[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("data:")) continue;
    assertAssetReference(raw, source, kind, match.index ?? 0, assetPaths);
    const pathname = raw.split(/[?#]/, 1)[0].replace(/^\.\//, "");
    references.add(pathname);
  }
  if (kind === "html") {
    for (const match of source.matchAll(/<(?:img|source)\b[^>]*\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
      for (const candidate of match[1].split(",")) {
        const raw = candidate.trim().split(/\s+/, 1)[0];
        assertAssetReference(raw, source, "html", (match.index ?? 0) + candidate.indexOf(raw), assetPaths);
        if (raw && !raw.startsWith("#") && !raw.startsWith("data:")) references.add(raw.split(/[?#]/, 1)[0].replace(/^\.\//, ""));
      }
    }
  }
  return references;
};

const rewriteAssetReferences = (source: string, kind: "html" | "css", outputPaths: ReadonlyMap<string, string>) => {
  const pattern = kind === "css" ? /url\(\s*(["']?)([^"')]+)\1\s*\)/gi : /(<(?:img|source|video|audio|link)\b[^>]*\b(?:src|href|poster)\s*=\s*)(["'])([^"']+)\2/gi;
  return source.replace(pattern, (...args: string[]) => {
    const whole = args[0];
    const raw = kind === "css" ? args[2] : args[3];
    const quote = kind === "css" ? args[1] : args[2];
    const prefix = kind === "css" ? "url(" : args[1];
    const split = raw.match(/^([^?#]*)(.*)$/);
    const target = split?.[1]?.replace(/^\.\//, "") ?? raw;
    const suffix = split?.[2] ?? "";
    const output = outputPaths.get(target);
    if (!output) return whole;
    const reference = kind === "css" ? path.posix.relative("assets", output) : output;
    return kind === "css" ? `url(${quote}${reference}${suffix}${quote})` : `${prefix}${quote}${reference}${suffix}${quote}`;
  }).replace(/(<(?:img|source)\b[^>]*\bsrcset\s*=\s*)(["'])([^"']+)\2/gi, (whole, prefix, quote, rawValue) => {
    const rewritten = rawValue.split(",").map((candidate: string) => {
      const [raw, ...descriptor] = candidate.trim().split(/\s+/);
      const split = raw.match(/^([^?#]*)(.*)$/);
      const target = split?.[1]?.replace(/^\.\//, "") ?? raw;
      const output = outputPaths.get(target);
      return output ? `${output}${split?.[2] ?? ""}${descriptor.length ? ` ${descriptor.join(" ")}` : ""}` : candidate.trim();
    }).join(", ");
    return `${prefix}${quote}${rewritten}${quote}`;
  });
};

const completeDocument = (source: string, title: string, cssPath: string, javascriptPath: string) => {
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${cssPath}">`;
  const script = `<script src="${javascriptPath}" defer></script>`;
  if (!/<html\b/i.test(source)) return `<!doctype html><html lang="en"><head>${head}</head><body>${source}${script}</body></html>`;
  const withHead = /<\/head\s*>/i.test(source) ? source.replace(/<\/head\s*>/i, `${head}</head>`) : source.replace(/<html\b[^>]*>/i, (tag) => `${tag}<head>${head}</head>`);
  return /<\/body\s*>/i.test(withHead) ? withHead.replace(/<\/body\s*>/i, `${script}</body>`) : `${withHead}${script}`;
};

const manifestFor = (files: Record<string, Buffer>, contentTypes: ReadonlyMap<string, string>): QuickShareReleaseManifest => ({
  version: QUICKSHARE_RELEASE_MANIFEST_VERSION,
  entry: "index.html",
  files: Object.keys(files).sort((left, right) => left === "index.html" ? -1 : right === "index.html" ? 1 : left.localeCompare(right)).map((filePath) => ({
    path: filePath,
    contentType: contentTypes.get(filePath) ?? "application/octet-stream",
    sha256: sha256(files[filePath]),
    byteSize: files[filePath].byteLength,
  })),
});

export const compileQuickShareWebPage = (input: { title: string; content: unknown }): QuickShareReleaseBundle => {
  const draft = parseQuickShareWebPageDraft(input.content);
  unsupportedSourceSyntax(draft);
  const inputPaths = new Set(draft.assets.map((asset) => asset.path));
  assetReferences(draft.html, "html", inputPaths);
  assetReferences(draft.css, "css", inputPaths);

  const files: Record<string, Buffer> = {};
  const contentTypes = new Map<string, string>();
  const outputPaths = new Map<string, string>();
  for (const asset of [...draft.assets].sort((left, right) => left.path.localeCompare(right.path))) {
    const bytes = decodeAsset(asset);
    const outputPath = assetPathFor(asset, bytes);
    outputPaths.set(asset.path, outputPath);
    files[outputPath] = bytes;
    contentTypes.set(outputPath, asset.contentType);
  }
  const css = rewriteAssetReferences(draft.css, "css", outputPaths);
  const cssPath = `assets/page.${sha256(css).slice(0, 16)}.css`;
  const javascriptPath = `assets/page.${sha256(draft.javascript).slice(0, 16)}.js`;
  files[cssPath] = Buffer.from(css, "utf8");
  files[javascriptPath] = Buffer.from(draft.javascript, "utf8");
  contentTypes.set(cssPath, "text/css; charset=utf-8");
  contentTypes.set(javascriptPath, "text/javascript; charset=utf-8");
  const html = completeDocument(rewriteAssetReferences(draft.html, "html", outputPaths), input.title, cssPath, javascriptPath);
  files["index.html"] = Buffer.from(html, "utf8");
  contentTypes.set("index.html", "text/html; charset=utf-8");
  return { manifest: manifestFor(files, contentTypes), files };
};
