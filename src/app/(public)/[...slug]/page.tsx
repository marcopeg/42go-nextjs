import { getAppInfo } from "@/lib/config/app-config";
import { appPage } from "@/lib/config/app-config-pages";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Page, { getPageMeta } from "@/components/Page";

interface DynamicPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
  return getPageMeta(slug.join("/").toLowerCase());
}

const DynamicPage = async ({ params }: DynamicPageProps) => {
  const { slug } = await params;
  const { config } = await getAppInfo();

  // Get the page id from the current url
  const pageId = slug.join("/").toLowerCase();
  const pageData = config?.pages?.[pageId];

  // Conditionally render the page's data
  if (!pageData) notFound();
  return <Page name={pageId} data={pageData} />;
};

// The dynamic page is protected as a feature flag by its url slug
export default appPage(DynamicPage, "url!");
