'use client';

import { signOut } from 'next-auth/react';
import { useCachedSession } from '@/lib/auth/use-cached-session';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useEnv } from '@/lib/env/use-env';

export function UserDashboard() {
  const { data: session, status } = useCachedSession();
  const isDevEnvironment = useEnv({
    environments: ['development'],
  });

  if (status === 'loading') {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    redirect('/login?callbackUrl=/app/dashboard');
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {session?.user?.name || session?.user?.email}</CardTitle>
          <CardDescription>You are logged in successfully</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Email:</span> {session?.user?.email}
            </div>
            {session?.user?.name && (
              <div>
                <span className="font-medium">Name:</span> {session.user.name}
              </div>
            )}
            {session?.user?.id && (
              <div>
                <span className="font-medium">User ID:</span> {session.user.id}
              </div>
            )}
            {isDevEnvironment && (
              <div className="mt-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md border border-yellow-300 dark:border-yellow-700">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">Hello Dev! 👋</p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  You&apos;re viewing the development environment
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: '/' })}>
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
