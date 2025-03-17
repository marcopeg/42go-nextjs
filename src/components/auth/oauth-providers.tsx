'use client';

import { useEffect, useState } from 'react';
import { GitHubLoginButton } from './github-login-button';
import { Separator } from '@/components/ui/separator';

export function OAuthProviders() {
  // Use client-side detection of GitHub OAuth
  const [isGitHubEnabled, setIsGitHubEnabled] = useState(false);

  useEffect(() => {
    // Check if GitHub OAuth is enabled on the client side
    const githubId = process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
    setIsGitHubEnabled(githubId);
  }, []);

  // Don't render anything during SSR or if no providers are enabled
  if (typeof window === 'undefined' || !isGitHubEnabled) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="space-y-2">
        <GitHubLoginButton isEnabled={isGitHubEnabled} />
      </div>
    </div>
  );
}
