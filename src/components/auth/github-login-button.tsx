'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface GitHubLoginButtonProps {
  isEnabled: boolean;
}

export function GitHubLoginButton({ isEnabled }: GitHubLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/app/dashboard';

  // If GitHub OAuth is not enabled, don't render anything
  if (!isEnabled) {
    return null;
  }

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);
      await signIn('github', { callbackUrl });
    } catch (error) {
      console.error('GitHub login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
      onClick={handleGitHubLogin}
      disabled={isLoading}
    >
      <Github className="h-4 w-4" />
      {isLoading ? 'Signing in...' : 'Sign in with GitHub'}
    </Button>
  );
}
