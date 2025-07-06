import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import type { ThemeValue } from "@/AppConfig";

interface ThemeProviderProps
  extends Omit<Parameters<typeof NextThemesProvider>[0], "defaultTheme"> {
  defaultTheme?: ThemeValue;
}

export const ThemeProvider = ({
  defaultTheme,
  ...props
}: ThemeProviderProps) => (
  <NextThemesProvider
    enableSystem
    disableTransitionOnChange
    attribute="class"
    defaultTheme={defaultTheme || "system"}
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
