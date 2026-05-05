import "server-only";

import type { TProfileSaveHooks } from "@/42go/profile";

export const getProfileSaveHooks = async (
  appId: string
): Promise<TProfileSaveHooks | undefined> => {
  if (appId === "lingocafe") {
    const { lingoCafeProfileHooks } = await import(
      "@/config/lingocafe/profile-hooks"
    );
    return lingoCafeProfileHooks;
  }

  return undefined;
};
