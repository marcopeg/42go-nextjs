import { getAppInfo } from "@/lib/config/app-config";
import { appPage } from "@/lib/config/app-config-pages";
import { Metadata } from "next";
import Page, { getPageMeta } from "@/42go/components/pages";

export async function generateMetadata(): Promise<Metadata> {
  return getPageMeta("HomePage");
}

const HomePage = async () => {
  const { config } = await getAppInfo();
  return <Page name="HomePage" data={config?.public?.pages?.HomePage} />;
};

export default appPage(HomePage, "*");
