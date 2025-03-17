'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your username/email and password to sign in</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username or Email</Label>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
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
          <Button variant="link" className="text-xs" asChild tabIndex={0}>
            <a href="/forgot-password">Forgot password?</a>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
