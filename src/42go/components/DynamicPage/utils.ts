import { getAppConfig } from "@/42go/config/app-config";

interface DynamicPageParams {
  slug: string[];
}

export const getPageId = (params: DynamicPageParams) =>
  params.slug.join("/").toLowerCase();

/**
 * Get the metadata for a specific page with fallback on app's meta.
 * Filters out themeColor as it should be handled in viewport (Next.js 15+)
 *
 * @param pageId
 * @returns
 */
export const getPageMeta = async (pageId: string) => {
  const config = await getAppConfig();
  const pageData = config?.public?.pages?.[pageId];
  const meta = pageData?.meta || config?.public?.meta || {};

  // Filter out themeColor as it should be in viewport, not metadata (Next.js 15+)
  if ("themeColor" in meta) {
    const cleanMeta = { ...meta };
    delete (cleanMeta as Record<string, unknown>).themeColor;
    return cleanMeta;
  }

  return meta;
};

export const getPageData = async (pageId: string) => {
  const config = await getAppConfig();
  return config?.public?.pages?.[pageId] || null;
};
