import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import {
  type AppName,
  getAppName,
  getAppConfig,
} from "@/lib/config/app-config"; // Keep getAppConfig for generateMetadata
import { AppConfigProvider } from "@/lib/config/AppConfigProvider";
import { ThemeProvider } from "@/lib/config/ThemeProvider";
import { ThemeToggle } from "@/lib/config/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const appConfig = await getAppConfig();

  return {
    ...appConfig?.meta,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName: AppName = await getAppName();
  const appConfig = await getAppConfig();

  console.log("@@@@@@ Layout: appName resolved to:", appName);
  console.log("@@@@@@ Layout: appConfig resolved to:", appConfig);

  if (!appName) {
    console.log("@@@@@@ Layout: No appName, rendering fallback layout");
    return (
      <html lang="en">
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__APP_NAME__ = null;`,
            }}
          />
        </head>
        <body className={inter.className}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    );
  }

  console.log("@@@@@@ Layout: Setting up app name for client:", appName);

  return (
    <html
      suppressHydrationWarning
      data-app-name={appName ?? undefined}
      lang="en"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__APP_NAME__ = ${JSON.stringify(appName)};`,
          }}
        />
      </head>
      <body className={inter.className}>
        <AppConfigProvider>
          <ThemeProvider>
            <nav className="w-full flex gap-4 p-4 border-b bg-gray-50 dark:bg-gray-800 dark:text-white mb-6">
              <Link href="/" className="font-semibold hover:underline">
                Home
              </Link>
              <Link href="/todos" className="font-semibold hover:underline">
                Todos
              </Link>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </nav>
            {children}
          </ThemeProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}
