'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PublicLayout } from '@/components/layout-public/public-layout';
import { MinimalLayout } from '@/components/layout-public/minimal-layout';
import { AppLayout } from '@/components/layout-app/app-layout';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

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
