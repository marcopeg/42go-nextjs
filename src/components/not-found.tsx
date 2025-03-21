'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCachedSession } from '@/lib/auth/use-cached-session';

export default function NotFoundPage() {
  const { status } = useCachedSession();

  return (
    <div className="flex h-[90vh] w-full flex-col items-center justify-center py-12">
      <div className="container flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="text-xl text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="default">Go to Homepage</Button>
          </Link>
          {status === 'authenticated' && (
            <Link href="/app/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
