'use client';

import { usePathname } from 'next/navigation';
import { PublicLayout } from './public-layout';
import { AppLayout } from './app-layout';
import { MinimalLayout } from './minimal-layout';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();

  // Use app layout for /app routes and legacy app routes for backward compatibility
  const isAppRoute =
    pathname.startsWith('/app') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/users');

  // Use minimal layout (no header/footer) for login page
  if (pathname === '/login') {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  if (isAppRoute) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Use public layout for everything else
  return <PublicLayout>{children}</PublicLayout>;
}
