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

export const createQuicklistETag = (representation: unknown): string => {
  const digest = createHash("sha256")
    .update(JSON.stringify(stableValue(representation)))
    .digest("base64url");

  return `"ql-${digest}"`;
};

export const matchesIfNoneMatch = (
  headerValue: string | null,
  currentETag: string
): boolean => {
  if (!headerValue) return false;

  return headerValue.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || value === currentETag || value === `W/${currentETag}`;
  });
};
