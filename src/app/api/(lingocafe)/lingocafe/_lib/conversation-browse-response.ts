import { createHash } from "node:crypto";

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  return Object.keys(source)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue(source[key]);
      return result;
    }, {});
};

export const createConversationBrowseETag = (validator: unknown) => {
  const digest = createHash("sha256")
    .update(JSON.stringify(stableValue(validator)))
    .digest("base64url");
  return `"lc-conversations-${digest}"`;
};

export const matchesConversationBrowseETag = (
  header: string | null,
  etag: string
) =>
  header?.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || value === etag || value === `W/${etag}`;
  }) ?? false;

const browseHeaders = (etag: string) => ({
  "Cache-Control": "private, no-cache",
  ETag: etag,
  Vary: "Cookie",
});

export const conversationBrowseNotModified = (etag: string) =>
  new Response(null, { status: 304, headers: browseHeaders(etag) });

export const conversationBrowseResponse = (payload: unknown, etag: string) => {
  const headers = {
    ...browseHeaders(etag),
  };
  return Response.json(payload, { headers });
};
