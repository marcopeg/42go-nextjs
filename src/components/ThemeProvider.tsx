"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0];

export function ThemeProvider(props: ThemeProviderProps) {
  return <NextThemesProvider {...props} />;
}

export const useTheme = () => {
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, theme, resolvedTheme } = useNextTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return { setTheme, theme, resolvedTheme, mounted };
};
