'use client';

import { usePathname } from 'next/navigation';
import { useCachedSession } from '@/lib/auth/use-cached-session';
import { PublicLayout } from '@/components/layout-public/public-layout';
import { MinimalLayout } from '@/components/layout-public/minimal-layout';
import { AppLayout } from '@/components/layout-app/app-layout';
import { useState, useEffect, useMemo, useCallback } from 'react';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();
  const { data: session, status } = useCachedSession();
  const [isInitializing, setIsInitializing] = useState(true);

  // Memoize the session status check to prevent redundant state updates
  const handleAuthStateChange = useCallback(() => {
    if (status !== 'loading' && isInitializing) {
      setIsInitializing(false);
    }
  }, [status, isInitializing]);

  // Wait for authentication state to be determined
  useEffect(() => {
    handleAuthStateChange();
  }, [handleAuthStateChange]);

  // Memoize these values to prevent recalculations on every render
  const layoutInfo = useMemo(() => {
    const isAppRoute = pathname.startsWith('/app');
    const isLoginRoute = pathname === '/login';
    const isAuthenticated = status === 'authenticated' && !!session;

    return { isAppRoute, isLoginRoute, isAuthenticated };
  }, [pathname, status, session]);

  // Memoize the loading component
  const loadingView = useMemo(
    () => (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    ),
    []
  );

  // During initialization, render a loading indicator
  if (isInitializing) {
    return loadingView;
  }

  // Determine which layout to use based on route and auth state
  if (layoutInfo.isLoginRoute) {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  if (layoutInfo.isAppRoute && layoutInfo.isAuthenticated) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Default to public layout
  return <PublicLayout>{children}</PublicLayout>;
}
