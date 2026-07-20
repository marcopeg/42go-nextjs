import { ManifestLink } from "@/42go/pwa/ManifestLink";
import {
  getCurrentPWAInstallResolution,
  getPWAInstallManifestHref,
} from "@/42go/pwa/server/resolve-install-target";

export const HeadTags = async () => {
  const resolution = await getCurrentPWAInstallResolution();
  if (!resolution) return null;

  const manifestHref = getPWAInstallManifestHref(resolution);

  return (
    <>
      <meta
        name="format-detection"
        content="telephone=no,date=no,address=no,email=no"
      />
      <ManifestLink href={manifestHref} isPrivate={resolution.target.private} />
    </>
  );
};
