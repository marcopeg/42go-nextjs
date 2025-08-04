import { Metadata } from "next";
import { appPage } from "@/42go/config/app-config-pages";
import { getDocsList } from "@/42go/utils/docs";
import DocsList from "@/42go/components/docs/DocsList";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Browse all available documentation",
};

const DocsListPage = async () => {
  const files = await getDocsList();
  return <DocsList items={files!} basePath="docs" />;
};

export default appPage(DocsListPage, "docs");
