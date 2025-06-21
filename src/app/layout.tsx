import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import {
  type AppName,
  getAppName,
  getAppConfig,
} from "@/lib/config/app-config"; // Renamed from @/lib/config
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

  // Get the app-specific default theme
  const appDefaultTheme = appConfig?.theme?.default;

  if (!appName) {
    return (
      <html lang="en">
        <head></head>
        <body className={inter.className}>
          <ThemeProvider appDefaultTheme={appDefaultTheme}>
            {children}
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html
      suppressHydrationWarning
      data-app-name={appName ?? undefined}
      lang="en"
    >
      <head></head>
      <body className={inter.className}>
        <ThemeProvider appDefaultTheme={appDefaultTheme}>
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
          <AppConfigProvider>{children}</AppConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
