import { getAppConfig } from "@/lib/config/app-config";

/**
 * Get the metadata for a specific page with fallback on app's meta.
 *
 * @param pageId
 * @returns
 */
export const getPageMeta = async (pageId: string) => {
  const config = await getAppConfig();
  const pageData = config?.public?.pages?.[pageId];
  return pageData?.meta || config?.public?.meta || {};
};
