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

  // During initialization, render nothing or a simple loading indicator
  // This prevents layout flickering by delaying the first render until we know the auth state
  if (isInitializing) {
    // Return a minimal layout with just a loading indicator or nothing
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Use minimal layout (no header/footer) for login page
  if (pathname === '/login') {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  // Only use app layout for /app/* routes AND when user is authenticated
  const isAppRoute = pathname.startsWith('/app');
  const isAuthenticated = status === 'authenticated' && !!session;

  if (isAppRoute && isAuthenticated) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Use public layout for everything else
  return <PublicLayout>{children}</PublicLayout>;
}
