import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getAppInfo } from "@/lib/config/app-config";
import { InjectAppName } from "@/lib/config/InjectAppName";
import { Providers } from "@/components/Providers";
import "./globals.css";
import "./tailwind.css";

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
  const themeDefault = config?.theme?.default;

  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <InjectAppName name={name} />
      </head>
      <body className={inter.className}>
        <Providers defaultTheme={themeDefault}>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
