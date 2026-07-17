import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getServerSession } from "next-auth";
import { getAppInfo } from "@/42go/config/app-config";
import { InjectAppID } from "@/42go/config/InjectAppID";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentPWAInstallResolution } from "@/42go/pwa/server/resolve-install-target";
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
  const [{ config }, resolution] = await Promise.all([
    getAppInfo(),
    getCurrentPWAInstallResolution(),
  ]);
  const base = (config?.public?.meta || {}) as Metadata;
  if (!resolution) return base;

  const target = resolution.target;
  const derivedIcons: Metadata["icons"] = {
    icon: [
      { url: target.icons.faviconIco },
      { url: target.icons.favicon16, sizes: "16x16", type: "image/png" },
      { url: target.icons.favicon32, sizes: "32x32", type: "image/png" },
    ],
    apple: [
      {
        url: target.icons.appleTouch180,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };

  const derived: Metadata = {
    ...(resolution.source === "override" ? { title: target.name } : {}),
    applicationName: target.name || base.applicationName,
    icons: derivedIcons,
    appleWebApp: {
      capable: true,
      title: target.name,
      statusBarStyle: target.statusBarStyle,
    },
  };

  return { ...base, ...derived };
};

export const generateViewport = async (): Promise<Viewport> => {
  const resolution = await getCurrentPWAInstallResolution();
  if (!resolution) return {};

  return {
    themeColor: resolution.target.themeColor,
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
        {/* Sole manifest link; Apple metadata/icons are emitted by Metadata. */}
        <HeadTags />
      </head>
      {/* Use Tailwind font token so themes and utilities stay consistent */}
      <body className="font-sans">{body}</body>
    </html>
  );
};

export default RootLayout;
