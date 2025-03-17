'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OAuthProviders } from './oauth-providers';

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const isFormFilled = username.trim() !== '' && password.trim() !== '';

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
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        setError('Invalid username/email or password');
        setIsLoading(false);
        return;
      }

      if (result?.url) {
        router.push(result.url);
      } else {
        router.push('/dashboard');
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
    <Card>
      <form onSubmit={onSubmit}>
        <CardContent className="pt-6">
          <div className="space-y-1 my-4">
            <Label htmlFor="username" className="text-sm mb-2 ml-3">
              Login with password
            </Label>
            <div className="space-y-0">
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="username or name@example.com"
                required
                autoFocus
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-1 pt-0">
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
          <Button variant="link" className="text-xs h-8" asChild tabIndex={0}>
            <a href="/forgot-password">Forgot password?</a>
          </Button>
        </CardFooter>
      </form>

      {/* OAuth Providers */}
      <CardContent className="pt-0">
        <OAuthProviders />
      </CardContent>
    </Card>
  );
}
