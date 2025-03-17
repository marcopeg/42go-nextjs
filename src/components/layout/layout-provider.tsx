'use client';

import { usePathname } from 'next/navigation';
import { PublicLayout } from './public-layout';
import { AppLayout } from './app-layout';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();

  // Use app layout for dashboard and settings
  const isAppRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/settings');

  if (isAppRoute) {
    return <AppLayout>{children}</AppLayout>;
  }

  // Use public layout for everything else
  return <PublicLayout>{children}</PublicLayout>;
}
