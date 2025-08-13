import { Metadata } from "next";
import { protectPage } from "@/42go/policy/protectPage";
import { getDocMetadata, getDocData } from "@/42go/utils/docs";
import DocPageComponent from "@/42go/components/docs/DocPage";

export interface DocPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  return getDocMetadata(params);
}

const DocPage = async ({ params }: DocPageProps) => {
  const doc = await getDocData(params);
  const _params = await params;
  return <DocPageComponent doc={doc} basePath="docs" slug={_params.slug} />;
};

export default protectPage(DocPage, { require: { feature: "page:docs" } });
