/**
 * Safely decodes a potentially percent-encoded book or page slug / identifier.
 * Handles single-encoded and double-encoded strings without throwing on malformed sequences.
 */
export const decodeReaderSlug = (
  value: string | string[] | undefined | null
): string => {
  if (!value) return "";
  let current = Array.isArray(value) ? value[0] || "" : value;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
};
