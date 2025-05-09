'use client';

import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { useEffect, useState } from 'react';
import { AppTitle } from '@/components/app-title';
import appConfig from '@/lib/config';

export function RegisterPage() {
  const [isPasswordAuthEnabled, setIsPasswordAuthEnabled] = useState(true);
  const [hasIcon, setHasIcon] = useState(false);

  useEffect(() => {
    // Check if password auth is enabled on the client side
    const passwordAuthEnabled = process.env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED !== 'false';
    setIsPasswordAuthEnabled(passwordAuthEnabled);

    // Check if icon exists in config
    setHasIcon(!!appConfig.icon);
  }, []);

  // If password auth is disabled, redirect to login page
  useEffect(() => {
    if (!isPasswordAuthEnabled) {
      window.location.href = '/login';
    }
  }, [isPasswordAuthEnabled]);

  // Don't render anything if password auth is disabled
  if (!isPasswordAuthEnabled) {
    return null;
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className={`flex flex-col space-y-2 ${!hasIcon ? 'text-center' : ''}`}>
          <Link href="/" className={hasIcon ? '' : 'mx-auto'}>
            <AppTitle className={hasIcon ? '' : 'justify-center'} />
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Create a new account to get started</p>
        </div>
        <RegisterForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-brand underline underline-offset-4">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
