'use client';

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { AppTitle } from '@/components/app-title';
import { useState, useEffect } from 'react';
import appConfig from '@/lib/config';

export function LoginPage() {
  const [hasIcon, setHasIcon] = useState(false);

  // Check if icon exists in config
  useEffect(() => {
    setHasIcon(!!appConfig.icon);
  }, []);

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className={`flex flex-col ${!hasIcon ? 'text-center' : ''}`}>
          <Link href="/" className={hasIcon ? '' : 'mx-auto'} tabIndex={-1}>
            <AppTitle className={hasIcon ? '' : 'justify-center'} />
          </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
