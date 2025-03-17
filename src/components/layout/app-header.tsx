'use client';

import Link from 'next/link';
import { UserMenu } from '@/components/auth/user-menu';
import { AppTitle } from '@/components/app-title';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppTitle />
          </Link>
        </div>

        {/* Main features - empty for now */}
        <div className="flex items-center gap-4">{/* Add main feature links here */}</div>

        <UserMenu />
      </div>
    </header>
  );
}
