export type QuicklistPollingLevel = "off" | "slow" | "medium" | "fast";

export const QUICKLIST_RESUME_SIGNAL_DEDUP_MS = 750;
export const QUICKLIST_PHONE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (hover: none) and (pointer: coarse) and (max-width: 960px) and (max-height: 540px)";
export const QUICKLIST_PORTRAIT_QUERY = "(orientation: portrait)";

export const shouldRunQuicklistAutoRefresh = (
  level: QuicklistPollingLevel | null
): boolean => level !== null && level !== "off";

export const shouldCoalesceQuicklistResumeSignal = (
  previousAt: number,
  nextAt: number
): boolean => nextAt - previousAt < QUICKLIST_RESUME_SIGNAL_DEDUP_MS;

type ShouldRunQuicklistPortraitRefreshInput = {
  wasPhoneLandscape: boolean;
  isPhoneLandscape: boolean;
  isPortrait: boolean;
  isBusy: boolean;
  isHidden: boolean;
};

export const shouldRunQuicklistPortraitRefresh = ({
  wasPhoneLandscape,
  isPhoneLandscape,
  isPortrait,
  isBusy,
  isHidden,
}: ShouldRunQuicklistPortraitRefreshInput): boolean =>
  wasPhoneLandscape &&
  !isPhoneLandscape &&
  isPortrait &&
  !isBusy &&
  !isHidden;
