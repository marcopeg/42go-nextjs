'use client';

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { AppTitle } from '@/components/app-title';

export function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col text-center">
          <Link href="/" className="mx-auto">
            <AppTitle className="justify-center" />
          </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
