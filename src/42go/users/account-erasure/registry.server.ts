import "server-only";

import { accountErasureHandlers as lingoCafeHandlers } from "@/config/lingocafe/account-erasure.server";
import { accountErasureHandlers as quicklistHandlers } from "@/config/quicklist/account-erasure.server";
import type { AccountErasureHandler } from "./types";

const handlersByAppId: Record<string, AccountErasureHandler[]> = {
  default: quicklistHandlers,
  lingocafe: lingoCafeHandlers,
  quicklist: quicklistHandlers,
};

export const getAccountErasureHandlers = (appId: string) =>
  [...(handlersByAppId[appId] || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id)
  );
