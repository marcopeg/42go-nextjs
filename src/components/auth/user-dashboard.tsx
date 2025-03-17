'use client';

import { useSession, signOut } from 'next-auth/react';
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

export function UserDashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

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
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: '/' })}>
              Sign out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
