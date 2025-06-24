import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/config/ThemeProvider";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  return {};
}

// Chuck Norris: get the app name from the server-side header logic
import { getAppName, getAppConfig } from "@/lib/config/app-config";
import InjectAppName from "@/lib/config/InjectAppName";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName = await getAppName();
  const appConfig = await getAppConfig();

  if (!appName) {
    return (
      <html suppressHydrationWarning lang="en">
        <head />
        <body className={inter.className}>
          <ThemeProvider config={appConfig}>{children}</ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <InjectAppName />
      </head>
      <body className={inter.className}>
        <ThemeProvider config={appConfig}>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
