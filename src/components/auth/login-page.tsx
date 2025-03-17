'use client';

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Link href="/">
            <h1 className="text-2xl font-semibold tracking-tight">Cursor Next Boilerplate</h1>
          </Link>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to sign in to your account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
