"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import { useAppConfig } from "./AppConfigProvider";
import type { ThemeValue } from "@/AppConfig";

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0];

export function ThemeProvider(props: ThemeProviderProps) {
  const appConfig = useAppConfig();

  // Determine the default theme based on app config or fallback to "system"
  const getDefaultTheme = (): ThemeValue => {
    // During initial render, appConfig might be null while DOM is being read
    if (appConfig?.theme?.default) {
      return appConfig.theme.default;
    }
    // Safe fallback to system preference
    return "system";
  };

  const defaultTheme = getDefaultTheme();
  console.log(
    "@@@@@@ ThemeProvider: defaultTheme resolved to:",
    defaultTheme,
    appConfig
  );

  return (
    <NextThemesProvider
      enableSystem
      disableTransitionOnChange
      attribute="class"
      defaultTheme={defaultTheme}
      {...props}
    />
  );
}

export const useTheme = () => {
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, theme, resolvedTheme } = useNextTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return { setTheme, theme, resolvedTheme, mounted };
};
