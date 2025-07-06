"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/config/ThemeProvider";
import { ThemeValue } from "@/AppConfig";

interface ProvidersProps {
  children: React.ReactNode;
  defaultTheme?: ThemeValue;
}

export function Providers({ children, defaultTheme }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>
    </SessionProvider>
  );
}
