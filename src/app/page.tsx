import { pageWithConfig } from "@/lib/app-page";
import type { AppConfig } from "../AppConfig";
import OriginDisplay from "@/components/OriginDisplay";

const HomePage = ({ config }: { config: AppConfig }) => {
  if (!config) return null;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      hello {config.name}!
      <OriginDisplay />
    </main>
  );
};

export default pageWithConfig(HomePage, "*");
