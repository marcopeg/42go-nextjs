import { z } from "zod";

export type QuicklistReorderItem = {
  id: string;
  text: string;
  position: number;
};

export type QuicklistReorderRepresentation = {
  list: {
    id: string;
    name: string;
    sortingInstructions: string;
  };
  items: QuicklistReorderItem[];
};

export type QuicklistRequestedPosition = {
  id: string;
  position: number;
};

export type QuicklistIfMatchStatus =
  | "missing"
  | "malformed"
  | "match"
  | "stale";

export const quicklistReorderRequestSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string().uuid(),
          position: z.number().int().min(1),
        })
        .strict()
    ),
  })
  .strict();

export const buildQuicklistReorderRepresentation = (
  list: {
    id: string;
    title: string;
    sortingInstructions: string;
  },
  items: Array<{ id: string; title: string; position: number }>
): QuicklistReorderRepresentation => ({
  list: {
    id: list.id,
    name: list.title,
    sortingInstructions: list.sortingInstructions,
  },
  items: items.map((item) => ({
    id: item.id,
    text: item.title,
    position: item.position,
  })),
});

export const evaluateQuicklistIfMatch = (
  headerValue: string | null,
  currentETag: string
): QuicklistIfMatchStatus => {
  if (headerValue === null || headerValue.trim() === "") return "missing";

  const value = headerValue.trim();
  if (
    value.includes(",") ||
    value === "*" ||
    value.startsWith("W/") ||
    !/^"[^"]+"$/.test(value)
  ) {
    return "malformed";
  }

  return value === currentETag ? "match" : "stale";
};

export const validateCompleteQuicklistItemIds = (
  currentIds: string[],
  requestedIds: string[]
): boolean => {
  if (
    requestedIds.length !== currentIds.length ||
    new Set(requestedIds).size !== requestedIds.length
  ) {
    return false;
  }

  const current = new Set(currentIds);
  return requestedIds.every((id) => current.has(id));
};

export const orderQuicklistRequestedPositions = (
  currentIds: string[],
  requestedItems: QuicklistRequestedPosition[]
): string[] | null => {
  const requestedIds = requestedItems.map((item) => item.id);
  if (!validateCompleteQuicklistItemIds(currentIds, requestedIds)) return null;

  const positions = requestedItems.map((item) => item.position);
  if (
    new Set(positions).size !== positions.length ||
    positions.some(
      (position) =>
        !Number.isInteger(position) ||
        position < 1 ||
        position > requestedItems.length
    )
  ) {
    return null;
  }

  const ordered = [...requestedItems].sort(
    (first, second) => first.position - second.position
  );
  if (ordered.some((item, index) => item.position !== index + 1)) return null;

  return ordered.map((item) => item.id);
};
