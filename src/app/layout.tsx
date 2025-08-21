import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getAppInfo } from "@/42go/config/app-config";
import { InjectAppID } from "@/42go/config/InjectAppID";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { resolvePWAColor, type TColorInput } from "@/42go/pwa/colors";
import "./tokens.css";
import "./tailwind.css";
import { HeadTags } from "@/42go/pwa/HeadTags";

// Expose Inter via CSS variable to integrate with Tailwind's font-sans token
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getAppInfo();
  const base = (config?.public?.meta || {}) as Metadata;
  const pwa = config?.public?.pwa;

  if (!pwa) return base;

  // Derive supported fields from public.pwa
  const themeColorInput = pwa.themeColor as TColorInput | undefined;
  const derived: Metadata = {
    applicationName: pwa.name || base.applicationName,
    themeColor: resolvePWAColor(themeColorInput) || base.themeColor,
    // Next metadata appleWebApp
    appleWebApp: {
      capable: true,
      title: pwa.name,
      statusBarStyle:
        (pwa.statusBarStyle as "default" | "black" | "black-translucent") ||
        "default",
    },
  };

  return { ...base, ...derived };
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { id: appID, config } = await getAppInfo();
  const themeDefault = config?.theme?.default;

  // Conditionally render the app's body based on a recognised configuration
  // TODO: redirect to a default app?
  const body = appID ? (
    <Providers defaultTheme={themeDefault}>{children}</Providers>
  ) : (
    <Providers defaultTheme={themeDefault}>not found</Providers>
  );

  return (
    <html suppressHydrationWarning lang="en" className={inter.variable}>
      <head>
        <InjectAppID id={appID} />
        {/* Global PWA/iOS tags derived from config.public.pwa */}
        <HeadTags />
      </head>
      {/* Use Tailwind font token so themes and utilities stay consistent */}
      <body className="font-sans">
        {body}
        <Toaster richColors />
      </body>
    </html>
  );
};

export default RootLayout;
