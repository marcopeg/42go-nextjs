import { appPage } from "@/42go/config/app-config-pages";
import { Metadata } from "next";
import Page, { getPageMeta, getPageData } from "@/42go/components/DynamicPage";

export async function generateMetadata(): Promise<Metadata> {
  return getPageMeta("HomePage");
}

const HomePage = async () => {
  const pageData = await getPageData("HomePage");
  return <Page name={"HomePage"} data={pageData} />;
};

export default appPage(HomePage, "*");
