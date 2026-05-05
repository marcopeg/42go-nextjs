import "server-only";

import type { TProfileLoadResult, TProfileSaveHooks } from "@/42go/profile";
import { trackReaderEvent } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";

type Diff = Record<string, { before: unknown; after: unknown }>;

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value ?? null;

  const source = value as Record<string, unknown>;
  return Object.keys(source)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stableValue(source[key]);
      return acc;
    }, {});
};

const isDifferent = (before: unknown, after: unknown) =>
  JSON.stringify(stableValue(before)) !== JSON.stringify(stableValue(after));

const buildDiff = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Diff => {
  const diff: Diff = {};
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of keys) {
    const beforeValue = before?.[key] ?? null;
    const afterValue = after?.[key] ?? null;
    if (!isDifferent(beforeValue, afterValue)) continue;

    diff[key] = {
      before: beforeValue,
      after: afterValue,
    };
  }

  return diff;
};

const trackDiff = async ({
  userId,
  name,
  before,
  after,
  db,
}: {
  userId: string;
  name: "profile-update" | "consent-update";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  db: Parameters<typeof trackReaderEvent>[0]["db"];
}) => {
  const diff = buildDiff(before, after);
  if (Object.keys(diff).length === 0) return;

  await trackReaderEvent({
    userId,
    name,
    data: { diff },
    db,
  });
};

const toRecord = (value: TProfileLoadResult["profile" | "consent"]) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const lingoCafeProfileHooks: TProfileSaveHooks = {
  onSaved: async ({ userId, before, after, db }) => {
    await trackDiff({
      userId,
      name: "profile-update",
      before: toRecord(before.profile),
      after: toRecord(after.profile),
      db,
    });

    await trackDiff({
      userId,
      name: "consent-update",
      before: toRecord(before.consent),
      after: toRecord(after.consent),
      db,
    });
  },
};
