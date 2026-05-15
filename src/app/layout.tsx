import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getServerSession } from "next-auth";
import { getAppInfo } from "@/42go/config/app-config";
import { InjectAppID } from "@/42go/config/InjectAppID";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { resolvePWAColor, type TColorInput } from "@/42go/pwa/colors";
import { resolveAppIcons } from "@/42go/icons";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { loadProfile } from "@/42go/profile/server";
import type { TProfileContextConfig } from "@/42go/profile";
import type { TProfileCompletionState } from "@/config/lingocafe/profile-completion-cache";
import "./tokens.css";
import "./tailwind.css";
import { HeadTags } from "@/42go/pwa/HeadTags";

const inter = localFont({
  src: [
    {
      path: "./fonts/inter/Inter-Variable.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "./fonts/inter/Inter-Italic-Variable.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

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

const getInitialProfileComplete = async ({
  appID,
  config,
}: {
  appID: string | null;
  config: Awaited<ReturnType<typeof getAppInfo>>["config"];
}): Promise<TProfileCompletionState | null> => {
  if (!appID || config?.app?.profile?.guard?.slot !== "before") return null;

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id;
  if (!userId) return null;

  const profileConfig: TProfileContextConfig = {
    ...(config?.app?.profile || {}),
    consent: config?.app?.consent,
  };
  const loaded = await loadProfile({
    userId,
    appId: appID,
    config: profileConfig,
  });

  return {
    appId: appID,
    userId,
    isComplete: loaded.isComplete,
  };
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { id: appID, config } = await getAppInfo();
  const themeDefault = config?.theme?.default;
  const initialProfileComplete = await getInitialProfileComplete({
    appID,
    config,
  });
  const providerKey = JSON.stringify({
    appID,
    initialProfileComplete,
  });

  const content = appID ? children : "not found";
  const body = (
    <Providers
      key={providerKey}
      appID={appID}
      defaultTheme={themeDefault}
      initialProfileCompletion={initialProfileComplete}
    >
      {content}
      <Toaster richColors />
    </Providers>
  );

  return (
    <html suppressHydrationWarning lang="en" className={inter.variable}>
      <head>
        <InjectAppID id={appID} />
        {/* Global PWA/iOS tags derived from config.public.pwa */}
        <HeadTags />
      </head>
      {/* Use Tailwind font token so themes and utilities stay consistent */}
      <body className="font-sans">{body}</body>
    </html>
  );
};

export default RootLayout;
