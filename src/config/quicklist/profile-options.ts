export const QUICKLIST_AUTO_REFRESH_PROFILE_KEY = "quicklistAutoRefresh";

export const quicklistAutoRefreshLevels = [
  "off",
  "slow",
  "medium",
  "fast",
] as const;

export type QuicklistAutoRefreshLevel =
  (typeof quicklistAutoRefreshLevels)[number];

export const DEFAULT_QUICKLIST_AUTO_REFRESH_LEVEL: QuicklistAutoRefreshLevel =
  "medium";

export const quicklistAutoRefreshIntervalMs: Record<
  QuicklistAutoRefreshLevel,
  number | null
> = {
  off: null,
  slow: 30_000,
  medium: 15_000,
  fast: 5_000,
};

export const isQuicklistAutoRefreshLevel = (
  value: unknown
): value is QuicklistAutoRefreshLevel =>
  typeof value === "string" &&
  quicklistAutoRefreshLevels.includes(value as QuicklistAutoRefreshLevel);

export const resolveQuicklistAutoRefreshLevel = (
  value: unknown
): QuicklistAutoRefreshLevel =>
  isQuicklistAutoRefreshLevel(value)
    ? value
    : DEFAULT_QUICKLIST_AUTO_REFRESH_LEVEL;

export const getQuicklistAutoRefreshIntervalMs = (
  value: unknown
): number | null =>
  quicklistAutoRefreshIntervalMs[resolveQuicklistAutoRefreshLevel(value)];

export const quicklistProfileSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    [QUICKLIST_AUTO_REFRESH_PROFILE_KEY]: {
      type: "string",
      enum: quicklistAutoRefreshLevels,
    },
  },
} as const;
