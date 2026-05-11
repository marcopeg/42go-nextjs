import "server-only";

import type { TProfileSaveHooks } from "@/42go/profile";

export const getProfileSaveHooks = async (
  _appId: string
): Promise<TProfileSaveHooks | undefined> => {
  void _appId;
  return undefined;
};
