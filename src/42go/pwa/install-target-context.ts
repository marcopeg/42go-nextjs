const INTERNAL_ORIGIN = "https://42go.invalid";
export const PWA_INSTALL_TARGET_QUERY = "__42go_pwa_target";

export const createPWAInstallTargetStartUrl = ({
  startUrl,
  targetId,
}: {
  startUrl: string;
  targetId: string;
}) => {
  if (!startUrl.startsWith("/") || startUrl.startsWith("//")) {
    throw new Error("PWA install-target start URL must be root-relative");
  }

  const parsed = new URL(startUrl, INTERNAL_ORIGIN);
  if (parsed.origin !== INTERNAL_ORIGIN || parsed.hash) {
    throw new Error("PWA install-target start URL must stay same-origin");
  }

  parsed.searchParams.set(PWA_INSTALL_TARGET_QUERY, targetId);
  return `${parsed.pathname}${parsed.search}`;
};

export const getPWAInstallTargetMarker = (search: string) =>
  new URLSearchParams(search).get(PWA_INSTALL_TARGET_QUERY);

export const isInstalledPWAInstallTarget = ({
  isStandalone,
  launchTargetId,
  storedTargetId,
  targetId,
}: {
  isStandalone: boolean;
  launchTargetId: string | null;
  storedTargetId: string | null;
  targetId: string;
}) =>
  isStandalone &&
  Boolean(targetId) &&
  (launchTargetId === targetId || storedTargetId === targetId);
