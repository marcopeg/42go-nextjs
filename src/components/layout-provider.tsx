'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PublicLayout } from '@/components/layout-public/public-layout';
import { MinimalLayout } from '@/components/layout-public/minimal-layout';
import { AppLayout } from '@/components/layout-app/app-layout';
import { useState, useEffect } from 'react';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isInitializing, setIsInitializing] = useState(true);

  // Wait for authentication state to be determined
  useEffect(() => {
    // Only set initializing to false once we have a definite auth state
    if (status !== 'loading') {
      setIsInitializing(false);
    }
  }, [status]);

  // Always compute these values regardless of the condition
  // This ensures hooks are called consistently
  const isAppRoute = pathname.startsWith('/app');
  const isLoginRoute = pathname === '/login';
  const isAuthenticated = status === 'authenticated' && !!session;

  // During initialization, render a loading indicator
  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Determine which layout to use based on route and auth state
  if (isLoginRoute) {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  if (isAppRoute && isAuthenticated) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Default to public layout
  return <PublicLayout>{children}</PublicLayout>;
}
