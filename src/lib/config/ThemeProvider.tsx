import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import type { AppConfig } from "./app-config";

interface ThemeProviderProps
  extends Omit<Parameters<typeof NextThemesProvider>[0], "defaultTheme"> {
  config?: AppConfig;
}

export const ThemeProvider = ({ config, ...props }: ThemeProviderProps) => (
  <NextThemesProvider
    enableSystem
    disableTransitionOnChange
    attribute="class"
    defaultTheme={config?.theme?.default || "system"}
    {...props}
  />
);

export const useTheme = () => {
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, theme, resolvedTheme } = useNextTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return { setTheme, theme, resolvedTheme, mounted };
};
