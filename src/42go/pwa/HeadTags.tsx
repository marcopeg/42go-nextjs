import { getAppConfig } from "@/42go/config/app-config";
import type { TPWAConfig } from "@/42go/pwa/types";

export const HeadTags = async () => {
  const config = await getAppConfig();
  const pwa: TPWAConfig | undefined = config?.public?.pwa as
    | TPWAConfig
    | undefined;

  if (!pwa) return null;

  const statusBar = pwa.statusBarStyle ?? "default";
  const appleIcon = pwa.icons?.appleTouch180 ?? "/images/icons/default-180.png";

  return (
    <>
      {/* iOS PWA meta */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={pwa.name} />
      <meta name="apple-mobile-web-app-status-bar-style" content={statusBar} />

      {/* iOS home screen icon */}
      <link rel="apple-touch-icon" href={appleIcon} sizes="180x180" />
    </>
  );
};
