import "server-only";

import type { TPWAInstallTargetResolver } from "@/42go/pwa/types";
import { resolveQuicklistProjectInstallTarget } from "@/config/quicklist/pwa.server";

export const PWA_INSTALL_TARGET_RESOLVERS = {
  "quicklist-project": resolveQuicklistProjectInstallTarget,
} as const satisfies Record<string, TPWAInstallTargetResolver>;
