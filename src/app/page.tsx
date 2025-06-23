import { pageWithConfig } from "@/lib/config/app-config-pages";
import OriginDisplay from "@/components/OriginDisplay";

export default async function HomePage() {
  return pageWithConfig(
    (config) => (
      <main className="flex min-h-screen flex-col items-center justify-between p-24 dark:bg-gray-900 dark:text-white">
        hello {config.name}!
        <OriginDisplay />
      </main>
    ),
    "*"
  );
}
