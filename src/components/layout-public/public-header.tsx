'use client';

import Link from 'next/link';
import { UserMenu } from '@/components/auth/user-menu';
import { AppTitle } from '@/components/app-title';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <AppTitle />
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
