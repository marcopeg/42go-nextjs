"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { apps, type TAppConfig, type TAppID } from "@/AppConfig";
import { PWA_MANIFEST_PATH } from "@/42go/pwa/constants";
import { shouldReloadPWAInstallDocument } from "@/42go/pwa/document-identity";
import {
  matchPWAPathPattern,
  validatePWAInstallTargetDeclarations,
} from "@/42go/pwa/path-pattern";

type TManifestLinkState = {
  href: string;
  private: boolean;
};

const subscribeToHydration = () => () => {};

const fillManifestPathTemplate = (
  template: string,
  params: Readonly<Record<string, string>>
) =>
  template.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
    const value = params[name];
    return value === undefined ? match : encodeURIComponent(value);
  });

const resolveClientManifestLink = ({
  appId,
  pathname,
}: {
  appId: TAppID;
  pathname: string;
}): TManifestLinkState => {
  const config: TAppConfig = appId ? apps[appId] : null;
  const declarations = config?.public?.pwa?.targets || [];
  validatePWAInstallTargetDeclarations(declarations);

  for (const declaration of declarations) {
    const params = matchPWAPathPattern(declaration.pattern, pathname);
    if (!params) continue;

    const manifestPath = declaration.manifestPath
      ? fillManifestPathTemplate(declaration.manifestPath, params)
      : pathname;
    const search = new URLSearchParams({ path: manifestPath });

    return {
      href: `${PWA_MANIFEST_PATH}?${search.toString()}`,
      private: true,
    };
  }

  return { href: PWA_MANIFEST_PATH, private: false };
};

export const ManifestLink = ({
  appId,
  initialHref,
  initialPathname,
  initialPrivate,
}: {
  appId: TAppID;
  initialHref: string;
  initialPathname: string;
  initialPrivate: boolean;
}) => {
  const pathname = usePathname();
  const resolved = useMemo(
    () => resolveClientManifestLink({ appId, pathname }),
    [appId, pathname]
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const initial: TManifestLinkState = {
    href: initialHref,
    private: initialPrivate,
  };
  const link = hydrated ? resolved : initial;

  useEffect(() => {
    if (
      !shouldReloadPWAInstallDocument({
        currentHref: resolved.href,
        currentPathname: pathname,
        initialHref,
        initialPathname,
      })
    ) {
      return;
    }

    // Browsers associate installation metadata with the loaded document.
    // Crossing virtual-app identities through client navigation must load a
    // fresh document so Safari and Chromium parse the new manifest as primary.
    window.location.reload();
  }, [initialHref, initialPathname, pathname, resolved.href]);

  return (
    <link
      key={link.href}
      rel="manifest"
      href={link.href}
      crossOrigin={link.private ? "use-credentials" : undefined}
    />
  );
};
