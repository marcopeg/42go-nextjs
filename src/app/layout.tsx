import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getAppInfo } from "@/42go/config/app-config";
import { InjectAppID } from "@/42go/config/InjectAppID";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { resolvePWAColor, type TColorInput } from "@/42go/pwa/colors";
import { resolveAppIcons } from "@/42go/icons";
import "./tokens.css";
import "./tailwind.css";
import { HeadTags } from "@/42go/pwa/HeadTags";

// Expose Inter via CSS variable to integrate with Tailwind's font-sans token
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const generateMetadata = async (): Promise<Metadata> => {
  const { id: appID, config } = await getAppInfo();
  const base = (config?.public?.meta || {}) as Metadata;
  const pwa = config?.public?.pwa;
  const icons = resolveAppIcons(appID, config);
  const derivedIcons: Metadata["icons"] = {
    icon: [
      { url: icons.faviconIco },
      { url: icons.favicon16, sizes: "16x16", type: "image/png" },
      { url: icons.favicon32, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: icons.appleTouch180, sizes: "180x180", type: "image/png" }],
  };

  if (!pwa) return { ...base, icons: derivedIcons };

  // Derive supported fields from public.pwa (excluding themeColor - moved to viewport)
  const derived: Metadata = {
    applicationName: pwa.name || base.applicationName,
    icons: derivedIcons,
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

export const generateViewport = async (): Promise<Viewport> => {
  const { config } = await getAppInfo();
  const pwa = config?.public?.pwa;

  if (!pwa) return {};

  // themeColor goes in viewport as of Next.js 15
  const themeColorInput = pwa.themeColor as TColorInput | undefined;

  return {
    themeColor: resolvePWAColor(themeColorInput) || "#000000",
  };
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
