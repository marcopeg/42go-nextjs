import { getAppConfig } from "@/lib/app-config"; // Renamed from @/lib/config
import type { AppConfig } from "../AppConfig";
import OriginDisplay from "@/components/OriginDisplay";

export default async function HomePage() {
  const appConfig: AppConfig | null = await getAppConfig(); // Renamed from getRequestConfig

  if (!appConfig) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div>Error: Application configuration could not be loaded.</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      hello {appConfig.name}!
      <OriginDisplay />
    </main>
  );
}
