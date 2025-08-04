import { notFound } from "next/navigation";
import { Metadata } from "next";
import PageUI, {
  getPageId,
  getPageMeta,
  getPageData,
} from "@/42go/components/DynamicPage";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const pageId = await getPageId(await params);
  return getPageMeta(pageId);
}

const Page = async ({ params }: PageProps) => {
  const pageId = await getPageId(await params);
  const pageData = await getPageData(pageId);
  return pageData ? <PageUI name={pageId} data={pageData} /> : notFound();
};

export default Page;
