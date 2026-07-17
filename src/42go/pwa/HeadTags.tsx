import { headers } from "next/headers";

import { getAppInfo } from "@/42go/config/app-config";
import { PWA_PATHNAME_HEADER } from "@/42go/pwa/constants";
import { ManifestLink } from "@/42go/pwa/ManifestLink";
import {
  getCurrentPWAInstallResolution,
  getPWAInstallManifestHref,
} from "@/42go/pwa/server/resolve-install-target";

export const HeadTags = async () => {
  const [{ id: appId }, resolution, requestHeaders] = await Promise.all([
    getAppInfo(),
    getCurrentPWAInstallResolution(),
    headers(),
  ]);
  if (!resolution) return null;

  const manifestHref = getPWAInstallManifestHref(resolution);
  const initialPathname = requestHeaders.get(PWA_PATHNAME_HEADER) || "/";

  return (
    <>
      <meta
        name="format-detection"
        content="telephone=no,date=no,address=no,email=no"
      />
      <ManifestLink
        appId={appId}
        initialHref={manifestHref}
        initialPathname={initialPathname}
        initialPrivate={resolution.target.private}
      />
    </>
  );
};
