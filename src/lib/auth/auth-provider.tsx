'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useEffect, useRef, useMemo } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Don't reuse key changes at all - use a stable key forever
  // React's key system is causing unnecessary remounts and session fetches

  // Using a ref to track mount state without causing re-renders
  const isComponentMounted = useRef(false);

  // Mark initialization on first mount only - this prevents multiple requests
  useEffect(() => {
    if (!isComponentMounted.current) {
      isComponentMounted.current = true;
    }
  }, []);

  // Memoize the session provider options to prevent re-renders
  const sessionOptions = useMemo(
    () => ({
      // Longer refresh interval to reduce API calls
      refetchInterval: 15 * 60, // 15 minutes
      // Don't refetch just because window gets focus - rely on interval
      refetchOnWindowFocus: false,
    }),
    []
  );

  return (
    // Don't use dynamic key - it causes remounts which trigger multiple session fetches
    <SessionProvider {...sessionOptions}>{children}</SessionProvider>
  );
}
