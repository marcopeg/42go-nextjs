"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  detectPWAInstallPlatform,
  type TPWAInstallPlatform,
} from "@/42go/pwa/install-platform";

type TInstallOutcome = "accepted" | "dismissed" | "unavailable";

type TBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type TPWAInstallContext = {
  canPrompt: boolean;
  isStandalone: boolean;
  platform: TPWAInstallPlatform;
  promptInstall: () => Promise<TInstallOutcome>;
};

export const PWAInstallContext = createContext<TPWAInstallContext | null>(null);

const getBrowserState = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isStandalone: false,
      platform: "other" as const,
    };
  }

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return {
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true,
    platform: detectPWAInstallPlatform({
      userAgent: navigator.userAgent,
      vendor: navigator.vendor || "",
      platform: navigator.platform || "",
      maxTouchPoints: navigator.maxTouchPoints || 0,
    }),
  };
};

export const PWAInstallProvider = ({ children }: { children: ReactNode }) => {
  const [promptEvent, setPromptEvent] =
    useState<TBeforeInstallPromptEvent | null>(null);
  const [browserState, setBrowserState] = useState(getBrowserState);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const refreshBrowserState = () => setBrowserState(getBrowserState());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as TBeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setPromptEvent(null);
      refreshBrowserState();
    };

    refreshBrowserState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", refreshBrowserState);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", refreshBrowserState);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<TInstallOutcome> => {
    if (!promptEvent) return "unavailable";

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    return choice.outcome;
  }, [promptEvent]);

  const value = useMemo<TPWAInstallContext>(
    () => ({
      canPrompt: Boolean(promptEvent),
      isStandalone: browserState.isStandalone,
      platform: browserState.platform,
      promptInstall,
    }),
    [browserState, promptEvent, promptInstall]
  );

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
    </PWAInstallContext.Provider>
  );
};
