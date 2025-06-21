"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import type { ThemeValue } from "@/AppConfig";

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0] & {
  appDefaultTheme?: ThemeValue;
};

export function ThemeProvider({
  appDefaultTheme,
  ...props
}: ThemeProviderProps) {
  // Use app-specific default theme or fallback to "system"
  const defaultTheme = appDefaultTheme || "system";

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
