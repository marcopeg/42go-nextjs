export type QuickSharePreviewAsset = {
  path: string;
  contentType: string;
  data: string;
};

const toDataUrl = (asset: QuickSharePreviewAsset) => `data:${asset.contentType};base64,${asset.data}`;

const rewriteAssetReferences = (source: string, assets: ReadonlyMap<string, string>) => source.replace(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi, (whole, attribute, quote, rawValue) => {
  const [pathname, suffix = ""] = rawValue.split(/(?=[?#])/, 2);
  const replacement = assets.get(pathname.replace(/^\.\//, ""));
  return replacement ? `${attribute}=${quote}${replacement}${suffix}${quote}` : whole;
}).replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (whole, quote, rawValue) => {
  const [pathname, suffix = ""] = rawValue.split(/(?=[?#])/, 2);
  const replacement = assets.get(pathname.replace(/^\.\//, ""));
  return replacement ? `url(${quote}${replacement}${suffix}${quote})` : whole;
});

const escapeClosingTag = (source: string, tag: string) => source.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);

export const buildQuickShareWebPagePreview = (input: {
  html: string;
  css: string;
  javascript: string;
  assets: QuickSharePreviewAsset[];
}) => {
  const assets = new Map(input.assets.map((asset) => [asset.path, toDataUrl(asset)]));
  const html = rewriteAssetReferences(input.html, assets);
  const css = escapeClosingTag(rewriteAssetReferences(input.css, assets), "style");
  const javascript = escapeClosingTag(input.javascript, "script");
  const body = /<html\b/i.test(html) ? html : `<!doctype html><html><head></head><body>${html}</body></html>`;
  const previewHead = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; img-src data: blob:; media-src data: blob:; font-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'"><style>${css}</style>`;
  // Insert before user-authored head children. CSP meta policy only governs
  // elements parsed after it, so appending it at </head> would be too late.
  const withHead = /<head\b[^>]*>/i.test(body)
    ? body.replace(/<head\b[^>]*>/i, (tag) => `${tag}${previewHead}`)
    : body.replace(/<html\b[^>]*>/i, (tag) => `${tag}<head>${previewHead}</head>`);
  return /<\/body\s*>/i.test(withHead) ? withHead.replace(/<\/body\s*>/i, `<script>${javascript}</script></body>`) : `${withHead}<script>${javascript}</script>`;
};
