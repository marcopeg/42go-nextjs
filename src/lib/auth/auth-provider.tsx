'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useState, useEffect } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Add a key state that changes when auth changes to force a complete remount
  // This prevents React hooks inconsistency errors during auth transitions
  const [mountKey, setMountKey] = useState(0);

  // Force remount on client side
  useEffect(() => {
    // This will ensure a clean component tree on hydration
    setMountKey(prev => prev + 1);
  }, []);

  return (
    <SessionProvider
      // The key prop ensures the provider and all children remount when authentication changes
      key={`auth-provider-${mountKey}`}
      // Refetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Refetch when window focuses to keep session up-to-date
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
