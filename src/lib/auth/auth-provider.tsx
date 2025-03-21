'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useState, useEffect } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Using a ref-like pattern with useState to track if we've done the initial hydration
  const [hydrated, setHydrated] = useState(false);

  // Only run once on initial client-side hydration
  useEffect(() => {
    // Mark as hydrated to prevent further remounts
    if (!hydrated) {
      setHydrated(true);
    }
  }, [hydrated]);

  return (
    <SessionProvider
      // Only use the key for initial hydration, then keep it stable
      key={`auth-provider-${hydrated ? 'stable' : 'initial'}`}
      // Refetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Refetch when window focuses to keep session up-to-date
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
