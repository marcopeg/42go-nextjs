/** Supported book content without enabling raw HTML or active embedded media. */
export const readerBookAllowedElements = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "em", "strong",
  "img", "a", "ul", "ol", "li",
];

export const getReaderCoverOverride = (info: unknown): string | null => {
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  const value = (info as Record<string, unknown>).cover_url;
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || /[\\\u0000-\u001f\u007f]/.test(url)) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if ((parsed.protocol === "https:" || parsed.protocol === "http:") &&
        !parsed.username && !parsed.password) return url;
  } catch { /* Invalid overrides use the existing project cover. */ }
  return null;
};
