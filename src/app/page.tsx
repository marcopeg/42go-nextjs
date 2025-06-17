import { getAppConfig } from "@/lib/app-config"; // Renamed from @/lib/config
import type { AppConfig } from "../AppConfig";
import OriginDisplay from "@/components/OriginDisplay";
import { notFound } from "next/navigation";

export default async function HomePage() {
  const appConfig: AppConfig = await getAppConfig();

  if (!appConfig) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      hello {appConfig.name}!
      <OriginDisplay />
    </main>
  );
}
