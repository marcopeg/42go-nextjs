import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import type { TAppConfig, TAppID } from "@/AppConfig";
import { getAppInfo } from "@/42go/config/app-config";
import { PWA_MANIFEST_PATH, PWA_PATHNAME_HEADER } from "@/42go/pwa/constants";
import {
  matchPWAPathPattern,
  validatePWAInstallTargetDeclarations,
} from "@/42go/pwa/path-pattern";
import { getPWAInstallTargetResolver } from "@/42go/pwa/server/registry";
import {
  mergePWAInstallTarget,
  resolveBasePWAInstallTarget,
} from "@/42go/pwa/target-from-config";
import type { TPWAInstallResolution } from "@/42go/pwa/types";

export const resolvePWAInstallTargetForPath = async ({
  appId,
  config,
  pathname,
  requireOverride = false,
}: {
  appId: TAppID;
  config: TAppConfig;
  pathname: string;
  requireOverride?: boolean;
}): Promise<TPWAInstallResolution | null> => {
  const base = resolveBasePWAInstallTarget(appId, config);
  const declarations = config?.public?.pwa?.targets || [];
  validatePWAInstallTargetDeclarations(declarations);

  for (const declaration of declarations) {
    const params = matchPWAPathPattern(declaration.pattern, pathname);
    if (!params) continue;

    const resolver = getPWAInstallTargetResolver(declaration.resolver);
    if (!resolver) {
      throw new Error(
        `Missing PWA install-target resolver "${declaration.resolver}"`
      );
    }

    const overrides = await resolver({
      appId: appId || "",
      pathname,
      params,
    });

    if (!overrides) {
      return requireOverride ? null : { target: base, source: "app" };
    }

    return {
      target: mergePWAInstallTarget({ base, overrides }),
      source: "override",
    };
  }

  return requireOverride ? null : { target: base, source: "app" };
};

export const getCurrentPWAInstallResolution = cache(async () => {
  const [{ id: appId, config }, requestHeaders] = await Promise.all([
    getAppInfo(),
    headers(),
  ]);
  const pathname = requestHeaders.get(PWA_PATHNAME_HEADER) || "/";

  return resolvePWAInstallTargetForPath({ appId, config, pathname });
});

export const getPWAInstallManifestHref = (
  resolution: TPWAInstallResolution
) => {
  if (resolution.source === "app" || !resolution.target.manifestPath) {
    return PWA_MANIFEST_PATH;
  }

  const params = new URLSearchParams({ path: resolution.target.manifestPath });
  return `${PWA_MANIFEST_PATH}?${params.toString()}`;
};
