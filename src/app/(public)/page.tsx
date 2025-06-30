import { getAppName } from "@/lib/config/app-config";
import { appPage } from "@/lib/config/app-config-pages";
import OriginDisplay from "@/components/OriginDisplay";

const HomePage = async () => {
  const appName = await getAppName();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 dark:bg-gray-900 dark:text-white">
      <div className="bg-primary text-primary-foreground">hello {appName}!</div>
      <OriginDisplay />
    </main>
  );
};

export default appPage(HomePage, "*");
