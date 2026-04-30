"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/42go/config/ThemeProvider";
import { ThemeValue } from "@/AppConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

interface ProvidersProps {
  children: React.ReactNode;
  defaultTheme?: ThemeValue;
}

export function Providers({ children, defaultTheme }: ProvidersProps) {
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
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
