'use client';

import { useEffect, useState } from 'react';
import { GitHubLoginButton } from './github-login-button';
import { GoogleLoginButton } from './google-login-button';
import { FacebookLoginButton } from './facebook-login-button';
import { Separator } from '@/components/ui/separator';

interface OAuthProvidersProps {
  showSeparator?: boolean;
}

export function OAuthProviders({ showSeparator = true }: OAuthProvidersProps) {
  // Use client-side detection of OAuth providers
  const [isGitHubEnabled, setIsGitHubEnabled] = useState(false);
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false);
  const [isFacebookEnabled, setIsFacebookEnabled] = useState(false);
  const [isPasswordAuthEnabled, setIsPasswordAuthEnabled] = useState(true);

  useEffect(() => {
    // Check if OAuth providers are enabled on the client side
    const githubEnabled = process.env.NEXT_PUBLIC_GITHUB_ENABLED === 'true';
    const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';
    const facebookEnabled = process.env.NEXT_PUBLIC_FACEBOOK_ENABLED === 'true';
    const passwordAuthEnabled = process.env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED !== 'false';

    setIsGitHubEnabled(githubEnabled);
    setIsGoogleEnabled(googleEnabled);
    setIsFacebookEnabled(facebookEnabled);
    setIsPasswordAuthEnabled(passwordAuthEnabled);
  }, []);

  // Don't render anything during SSR or if no providers are enabled
  if (
    typeof window === 'undefined' ||
    (!isGitHubEnabled && !isGoogleEnabled && !isFacebookEnabled)
  ) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      {isPasswordAuthEnabled && showSeparator && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {isGoogleEnabled && <GoogleLoginButton isEnabled={isGoogleEnabled} />}
        {isFacebookEnabled && <FacebookLoginButton isEnabled={isFacebookEnabled} />}
        {isGitHubEnabled && <GitHubLoginButton isEnabled={isGitHubEnabled} />}
      </div>
    </div>
  );
}
