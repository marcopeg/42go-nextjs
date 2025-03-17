'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OAuthProviders } from './oauth-providers';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isFormFilled =
    username.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '' &&
    confirmPassword.trim() !== '';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // For now, we'll just redirect to the login page with a success message
      // In a real implementation, you would call an API to register the user
      router.push('/login?registered=true');
      router.refresh();
    } catch (error) {
      setError('Something went wrong. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardContent className="pt-6">
          <div className="space-y-4 my-4">
            <Label htmlFor="username" className="text-sm mb-2 ml-3">
              Create your account
            </Label>
            <div className="space-y-2">
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Username"
                required
                autoFocus
                autoComplete="username"
                disabled={isLoading}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                required
                autoComplete="email"
                disabled={isLoading}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                required
                autoComplete="new-password"
                disabled={isLoading}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                required
                autoComplete="new-password"
                disabled={isLoading}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
            {isLoading ? 'Creating account...' : 'Create Account'}
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
