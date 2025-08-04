import { getAppConfig } from "@/42go/config/app-config";

interface DynamicPageParams {
  slug: string[];
}

export const getPageId = (params: DynamicPageParams) =>
  params.slug.join("/").toLowerCase();

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

export const getPageData = async (pageId: string) => {
  const config = await getAppConfig();
  return config?.public?.pages?.[pageId] || null;
};
