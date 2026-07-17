import "server-only";

import { PWA_INSTALL_TARGET_RESOLVERS } from "@/PWAInstallTargets";
import type { TPWAInstallTargetResolver } from "@/42go/pwa/types";

const resolvers = PWA_INSTALL_TARGET_RESOLVERS as Record<
  string,
  TPWAInstallTargetResolver
>;

export const getPWAInstallTargetResolver = (key: string) => resolvers[key];
