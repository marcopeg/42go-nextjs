'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OAuthProviders } from './oauth-providers';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/app';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordAuthEnabled, setIsPasswordAuthEnabled] = useState(true);
  const isFormFilled = username.trim() !== '' && password.trim() !== '';

  useEffect(() => {
    // Check if password auth is enabled on the client side
    const passwordAuthEnabled = process.env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED !== 'false';
    setIsPasswordAuthEnabled(passwordAuthEnabled);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const identifier = username.trim();
    const passwordValue = password.trim();

    try {
      // Sign in with credentials
      const result = await signIn('credentials', {
        email: identifier,
        password: passwordValue,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('Invalid username/email or password');
        setIsLoading(false);
        return;
      }

      if (result?.url) {
        router.push(result.url);
      } else {
        router.push(callbackUrl);
      }
      router.refresh();
    } catch (error) {
      setError('Something went wrong. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      {isPasswordAuthEnabled && (
        <form onSubmit={onSubmit}>
          <div className="pt-4">
            <div className="space-y-1 my-2">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Login with password
                  </span>
                </div>
              </div>
              <div className="space-y-0">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="username or name@example.com"
                  required
                  autoComplete="username email"
                  disabled={isLoading}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="rounded-b-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="password"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-t-none focus:ring-0 focus:ring-offset-0"
                />
              </div>
              {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
            </div>
          </div>
          <div className="flex flex-col space-y-1 pt-0">
            <Button
              type="submit"
              className={cn(
                'w-full bg-accent text-accent-foreground hover:bg-accent/90',
                !isFormFilled && 'opacity-70'
              )}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="flex justify-between w-full text-xs">
              <Button variant="link" className="h-8 px-0" asChild>
                <a href="/forgot-password">Forgot password?</a>
              </Button>
              {isPasswordAuthEnabled && (
                <Button variant="link" className="h-8 px-0" asChild>
                  <Link href="/register">Sign up!</Link>
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* OAuth Providers */}
      <div className={isPasswordAuthEnabled ? 'pt-0' : 'pt-6'}>
        <OAuthProviders showSeparator={isPasswordAuthEnabled} />
      </div>
    </div>
  );
}
