import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getAppInfo } from "@/lib/config/app-config";
import { InjectAppName } from "@/lib/config/InjectAppName";
import { ThemeProvider } from "@/lib/config/ThemeProvider";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getAppInfo();
  return config?.meta || {};
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { name, config } = await getAppInfo();

  // No app was found, so we render a minimal layout without the app name and nav.
  if (!name) {
    return (
      <html suppressHydrationWarning lang="en">
        <head>
          <InjectAppName name={name} />
        </head>
        <body className={inter.className}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    );
  }

  // App was found, so we render the full layout.
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <InjectAppName name={name} />
      </head>
      <body className={inter.className}>
        <ThemeProvider config={config}>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
