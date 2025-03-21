'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useRef } from 'react';
import type { Session } from 'next-auth';

// Create a stable key for the SessionProvider to prevent remounts
const STABLE_KEY = 'stable-session-provider';

interface AuthProviderProps {
  children: ReactNode;
  session?: Session | null; // Optional session prop to prevent duplicate fetches
}

/**
 * AuthProvider component that wraps SessionProvider with additional stability
 * to prevent React hook order issues during authentication transitions.
 */
export function AuthProvider({ children, session }: AuthProviderProps) {
  // Store the initial session value and prevent it from changing
  const initialSessionRef = useRef(session);

  // Store session options with consistent references
  const sessionOptions = {
    // Longer refresh interval to reduce API calls
    refetchInterval: 15 * 60, // 15 minutes
    // Don't refetch just because window gets focus - rely on interval
    refetchOnWindowFocus: false,
  };

  // For client-side only re-renders, use a different key to enforce
  // component stability during authentication transitions
  return (
    <SessionProvider
      key={STABLE_KEY}
      session={initialSessionRef.current}
      refetchInterval={sessionOptions.refetchInterval}
      refetchOnWindowFocus={sessionOptions.refetchOnWindowFocus}
    >
      {children}
    </SessionProvider>
  );
}
