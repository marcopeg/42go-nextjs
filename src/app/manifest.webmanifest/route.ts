import { getAppInfo } from "@/42go/config/app-config";
import { createPWAManifestResponse } from "@/42go/pwa/server/manifest-response";
import { resolvePWAInstallTargetForPath } from "@/42go/pwa/server/resolve-install-target";
import { resolveBasePWAInstallTarget } from "@/42go/pwa/target-from-config";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not Found", { status: 404 });

export const GET = async (request: Request) => {
  const { id: appId, config } = await getAppInfo();
  if (!appId || !config) return notFound();

  const targetPath = new URL(request.url).searchParams.get("path");
  if (!targetPath) {
    return createPWAManifestResponse(
      resolveBasePWAInstallTarget(appId, config)
    );
  }

  const resolution = await resolvePWAInstallTargetForPath({
    appId,
    config,
    pathname: targetPath,
    requireOverride: true,
  });
  if (!resolution || resolution.source !== "override") return notFound();

  return createPWAManifestResponse(resolution.target);
};
