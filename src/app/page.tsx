import { type AppConfig, pageWithConfig } from "@/lib/config/app-config-pages";
import OriginDisplay from "@/components/OriginDisplay";

const HomePage = ({ config }: { config: AppConfig }) => {
  if (!config) return null;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 dark:bg-gray-900 dark:text-white">
      hello {config.name}!
      <OriginDisplay />
    </main>
  );
};

export default pageWithConfig(HomePage, "*");
