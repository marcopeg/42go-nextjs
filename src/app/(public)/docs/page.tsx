import { Metadata } from "next";
import { protectPage } from "@/42go/policy/protectPage";
import { getDocsList, readDoc } from "@/42go/utils/docs";
import DocsList from "@/42go/components/docs/DocsList";

export async function generateMetadata(): Promise<Metadata> {
  const readme = await readDoc("README");
  return {
    title: readme?.data.title || "Documentation",
    description: readme?.data.description,
    keywords: readme?.data.keywords || [],
  };
}

const DocsListPage = async () => {
  const readme = await readDoc("README");
  const files = await getDocsList();
  return (
    <DocsList basePath="docs" items={files!} readme={readme || undefined} />
  );
};

export default protectPage(DocsListPage, {
  require: { feature: "page:docs" },
});
