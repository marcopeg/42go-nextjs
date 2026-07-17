export type TPWAInstallPlatform =
  | "ios"
  | "mac-safari"
  | "chromium"
  | "other";

export const detectPWAInstallPlatform = ({
  userAgent,
  vendor,
  platform,
  maxTouchPoints,
}: {
  userAgent: string;
  vendor: string;
  platform: string;
  maxTouchPoints: number;
}): TPWAInstallPlatform => {
  const normalizedAgent = userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(normalizedAgent);
  const isIPadDesktopMode =
    platform === "MacIntel" && maxTouchPoints > 1;
  if (isIOSDevice || isIPadDesktopMode) return "ios";

  const isChromium = /chrome|chromium|crios|edg|opr/.test(normalizedAgent);
  if (isChromium) return "chromium";

  const isMacSafari =
    platform.startsWith("Mac") &&
    vendor.includes("Apple") &&
    normalizedAgent.includes("safari");
  if (isMacSafari) return "mac-safari";

  return "other";
};
