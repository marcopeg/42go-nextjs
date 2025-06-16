import { getRequestConfig } from "@/lib/config"; // Use getRequestConfig
import type { AppConfig } from "../AppConfig.type"; // Removed .ts
import OriginDisplay from "@/components/OriginDisplay";

export default async function HomePage() {
  const appConfig: AppConfig | null = await getRequestConfig(); // Use getRequestConfig

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
