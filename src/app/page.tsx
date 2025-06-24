import { appPage } from "@/lib/config/app-config-pages";
import { useAppConfig } from "@/lib/config/use-app-config";
import OriginDisplay from "@/components/OriginDisplay";

const HomePage = () => {
  const config = useAppConfig();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 dark:bg-gray-900 dark:text-white">
      hello {config?.name}!
      <OriginDisplay />
    </main>
  );
};

export default appPage(HomePage, "*");
