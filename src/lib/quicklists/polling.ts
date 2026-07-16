export type QuicklistPollingLevel = "off" | "slow" | "medium" | "fast";

export const QUICKLIST_RESUME_SIGNAL_DEDUP_MS = 750;

export const shouldRunQuicklistAutoRefresh = (
  level: QuicklistPollingLevel | null
): boolean => level !== null && level !== "off";

export const shouldCoalesceQuicklistResumeSignal = (
  previousAt: number,
  nextAt: number
): boolean => nextAt - previousAt < QUICKLIST_RESUME_SIGNAL_DEDUP_MS;
