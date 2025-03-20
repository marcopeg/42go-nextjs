'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';

interface FacebookLoginButtonProps {
  isEnabled: boolean;
}

export function FacebookLoginButton({ isEnabled }: FacebookLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/app/dashboard';

  // If Facebook OAuth is not enabled, don't render anything
  if (!isEnabled) {
    return null;
  }

  const handleFacebookLogin = async () => {
    try {
      setIsLoading(true);
      await signIn('facebook', { callbackUrl });
    } catch (error) {
      console.error('Facebook login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
      onClick={handleFacebookLogin}
      disabled={isLoading}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          fill="#1877F2"
        />
      </svg>
      {isLoading ? 'Signing in...' : 'Sign in with Facebook'}
    </Button>
  );
}
