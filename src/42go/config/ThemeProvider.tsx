"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ThemeValue } from "@/AppConfig";

type ResolvedTheme = "light" | "dark";

type ThemeSnapshot = {
  mounted: boolean;
  resolvedTheme: ResolvedTheme;
  theme: ThemeValue;
};

type ThemeContextValue = ThemeSnapshot & {
  setTheme: (theme: ThemeValue) => void;
  systemTheme: ResolvedTheme;
  themes: ThemeValue[];
};

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeValue;
};

const STORAGE_KEY = "theme";
const THEMES: ThemeValue[] = ["light", "dark", "system"];
const ThemeContext = createContext<ThemeContextValue | null>(null);
const serverThemeSnapshot: ThemeSnapshot = {
  mounted: false,
  resolvedTheme: "light",
  theme: "system",
};

const listeners = new Set<() => void>();
let snapshot: ThemeSnapshot = {
  mounted: false,
  resolvedTheme: "light",
  theme: "system",
};
let hasInstalledListeners = false;

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const resolveTheme = (theme: ThemeValue): ResolvedTheme =>
  theme === "system" ? getSystemTheme() : theme;

const applyThemeClass = (theme: ThemeValue) => {
  if (typeof document === "undefined") return;

  const resolvedTheme = resolveTheme(theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolvedTheme);
  document.documentElement.style.colorScheme = resolvedTheme;
};

const notifyThemeListeners = () => {
  listeners.forEach((listener) => listener());
};

const setThemeSnapshot = (
  theme: ThemeValue,
  { notify = true }: { notify?: boolean } = {}
) => {
  snapshot = {
    mounted: typeof window !== "undefined",
    resolvedTheme: resolveTheme(theme),
    theme,
  };
  applyThemeClass(theme);
  if (notify) notifyThemeListeners();
};

const normalizeTheme = (
  value: string | null | undefined,
  fallback: ThemeValue
): ThemeValue =>
  value === "light" || value === "dark" || value === "system"
    ? value
    : fallback;

const initializeTheme = (defaultTheme: ThemeValue = "system") => {
  if (typeof window === "undefined") return;

  let storedTheme: string | null = null;
  try {
    storedTheme = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    storedTheme = null;
  }

  setThemeSnapshot(normalizeTheme(storedTheme, defaultTheme), {
    notify: false,
  });
};

const installGlobalListeners = () => {
  if (typeof window === "undefined" || hasInstalledListeners) return;
  hasInstalledListeners = true;

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    setThemeSnapshot(normalizeTheme(event.newValue, "system"));
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    if (snapshot.theme !== "system") return;
    setThemeSnapshot("system");
  };

  media.addEventListener("change", handleSystemChange);
};

const subscribeToTheme = (listener: () => void) => {
  installGlobalListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getThemeSnapshot = () => snapshot;

const getServerThemeSnapshot = () => serverThemeSnapshot;

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) => {
  const [setTheme] = useState(
    () => (theme: ThemeValue) => {
      setThemeSnapshot(theme);

      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Theme still applies for this tab when storage is unavailable.
      }
    }
  );
  const [didInitialize] = useState(() => {
    initializeTheme(defaultTheme);
    return true;
  });
  void didInitialize;

  const current = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  return (
    <ThemeContext.Provider
      value={{
        ...current,
        setTheme,
        systemTheme: getSystemTheme(),
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context) return context;

  return {
    ...getThemeSnapshot(),
    setTheme: setThemeSnapshot,
    systemTheme: getSystemTheme(),
    themes: THEMES,
  };
};
