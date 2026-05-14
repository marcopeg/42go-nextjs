"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { AppConfigProvider } from "@/42go/config/use-app-config";
import { ThemeProvider } from "@/42go/config/ThemeProvider";
import type { TAppID, ThemeValue } from "@/AppConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  hydrateLingoCafeProfileCompletion,
  setCurrentLingoCafeProfileUser,
  type TProfileCompletionState,
} from "@/config/lingocafe/profile-completion-cache";

interface ProvidersProps {
  children: React.ReactNode;
  appID: TAppID;
  defaultTheme?: ThemeValue;
  initialProfileCompletion?: TProfileCompletionState | null;
}

const hydrateProviderState = ({
  appID,
  initialProfileCompletion,
}: {
  appID: TAppID;
  initialProfileCompletion: TProfileCompletionState | null;
}) => {
  if (typeof window !== "undefined") {
    window.__APP_ID__ = appID || undefined;
  }

  if (appID === "lingocafe") {
    hydrateLingoCafeProfileCompletion(initialProfileCompletion);
  }
};

const SessionUserBridge = () => {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (status === "authenticated" && userId) {
      setCurrentLingoCafeProfileUser(userId);
      return;
    }

    if (status === "unauthenticated") {
      setCurrentLingoCafeProfileUser(null);
    }
  }, [status, userId]);

  return null;
};

export function Providers({
  children,
  appID,
  defaultTheme,
  initialProfileCompletion = null,
}: ProvidersProps) {
  const [didHydrateProviderState] = useState(() => {
    hydrateProviderState({ appID, initialProfileCompletion });
    return true;
  });
  void didHydrateProviderState;

  // Create a stable QueryClient instance that persists across re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 60 * 1000, // 15 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <AppConfigProvider appID={appID}>
      <SessionProvider>
        <SessionUserBridge />
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>
        </QueryClientProvider>
      </SessionProvider>
    </AppConfigProvider>
  );
}
