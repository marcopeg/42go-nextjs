import { getAppInfo } from "@/42go/config/app-config";
import { resolveAppIcons } from "@/42go/icons";
import type { TPWAConfig } from "@/42go/pwa/types";

export const HeadTags = async () => {
  const { id: appID, config } = await getAppInfo();
  if (!config) return null;

  const pwa: TPWAConfig | undefined = config?.public?.pwa as
    | TPWAConfig
    | undefined;
  const icons = resolveAppIcons(appID, config);

  const statusBar = pwa?.statusBarStyle ?? "default";
  const title = pwa?.name ?? config.name;

  return (
    <>
      <meta
        name="format-detection"
        content="telephone=no,date=no,address=no,email=no"
      />

      {pwa && (
        <>
          {/* iOS PWA meta */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content={title} />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content={statusBar}
          />
        </>
      )}

      {/* iOS home screen icon */}
      <link rel="apple-touch-icon" href={icons.appleTouch180} sizes="180x180" />
    </>
  );
};
