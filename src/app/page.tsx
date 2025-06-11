import OriginDisplay from "../components/OriginDisplay"; // Changed to relative path
import { headers } from "next/headers";
import { RequestAppConfig } from "@/middleware";

// This is now a Server Component
export default async function Home() {
  const headerList = await headers(); // Added await
  const configHeader = headerList.get("X-Request-Config");
  let appConfig: RequestAppConfig | null = null;

  if (configHeader) {
    try {
      appConfig = JSON.parse(configHeader);
    } catch (error) {
      console.error(
        "Failed to parse X-Request-Config header in Home page:",
        error
      );
    }
  }

  const serverSideOrigin = appConfig?.origin || null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {/* Pass the server-side origin as a prop to the Client Component */}
      <OriginDisplay serverSideOrigin={serverSideOrigin} />
    </main>
  );
}
