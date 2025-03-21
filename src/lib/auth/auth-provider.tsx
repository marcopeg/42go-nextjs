'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      // Refetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Refetch when window focuses to keep session up-to-date
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
