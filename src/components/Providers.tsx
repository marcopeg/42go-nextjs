"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/config/ThemeProvider";
import { AppConfig } from "@/AppConfig";

interface ProvidersProps {
  children: React.ReactNode;
  config: AppConfig;
}

export function Providers({ children, config }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider config={config}>{children}</ThemeProvider>
    </SessionProvider>
  );
}
