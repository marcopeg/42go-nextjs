import { protectPage } from "@/42go/policy/protectPage";
import { Metadata } from "next";
import Page, { getPageMeta, getPageData } from "@/42go/components/DynamicPage";

export async function generateMetadata(): Promise<Metadata> {
  return getPageMeta("HomePage");
}

const HomePage = async () => {
  const pageData = await getPageData("HomePage");
  return <Page name={"HomePage"} data={pageData} />;
};

// No feature enforced for root; protectPage will not infer feature for "/"
export default protectPage(HomePage);
