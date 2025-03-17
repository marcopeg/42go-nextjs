'use client';

import { useEffect, useState } from 'react';
import { GitHubLoginButton } from './github-login-button';
import { GoogleLoginButton } from './google-login-button';
import { Separator } from '@/components/ui/separator';

export function OAuthProviders() {
  // Use client-side detection of OAuth providers
  const [isGitHubEnabled, setIsGitHubEnabled] = useState(false);
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false);

  useEffect(() => {
    // Check if OAuth providers are enabled on the client side
    const githubEnabled = process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
    const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';

    setIsGitHubEnabled(githubEnabled);
    setIsGoogleEnabled(googleEnabled);
  }, []);

  // Don't render anything during SSR or if no providers are enabled
  if (typeof window === 'undefined' || (!isGitHubEnabled && !isGoogleEnabled)) {
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
        {isGitHubEnabled && <GitHubLoginButton isEnabled={isGitHubEnabled} />}
        {isGoogleEnabled && <GoogleLoginButton isEnabled={isGoogleEnabled} />}
      </div>
    </div>
  );
}
