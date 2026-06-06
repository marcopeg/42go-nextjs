'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getGenericInvalidEmailMessage, validateAuthEmail } from '@/42go/auth/lib/email/validation';

interface IdentifierLoginProps {
  providers: string[];
  callbackUrl: string;
  emailPrimaryActionLabel: string;
  tabIndex?: number;
}

type Step = 'identifier' | 'password' | 'code';
type MessageTone = 'error' | 'success';

const secondaryLinkButtonClass = 'w-full h-10 rounded-lg text-sm font-medium';
const emailAuthErrorCodes = new Set(['EmailCreateAccount', 'EmailSignin', 'Verification']);
const codeStepHelperText = 'We sent a verification code to your email.\nEnter it below to continue.';

const getEmailAuthErrorMessage = (error: string | null) => {
  if (!error || !emailAuthErrorCodes.has(error)) return null;
  if (error === 'Verification') return 'Invalid verification code.';
  return 'Authentication error occurred. Please try again.';
};

export const IdentifierLogin = ({
  providers,
  callbackUrl,
  emailPrimaryActionLabel,
  tabIndex = 0,
}: IdentifierLoginProps) => {
  const hasCredentials = providers.includes('credentials');
  const hasEmail = providers.includes('email');
  const searchParams = useSearchParams();
  const queryError = searchParams?.get('error') || null;
  const queryEmail = searchParams?.get('email') || '';
  const queryErrorMessage = getEmailAuthErrorMessage(queryError);
  const shouldStartOnCodeStep = hasEmail && queryError === 'Verification' && Boolean(queryEmail);
  const [step, setStep] = useState<Step>(shouldStartOnCodeStep ? 'code' : 'identifier');
  const [identifier, setIdentifier] = useState(queryEmail);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(queryErrorMessage);
  const [messageTone, setMessageTone] = useState<MessageTone>('error');
  const [isLoading, setIsLoading] = useState(false);

  const requestEmail = async (resend = false) => {
    const validation = validateAuthEmail(identifier);
    if (!validation.ok) {
      setMessageTone('error');
      setMessage(getGenericInvalidEmailMessage());
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const throttle = await fetch('/api/auth/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validation.email, resend }),
      });
      const throttleResult = await throttle.json();

      if (!throttle.ok || !throttleResult.ok) {
        setMessageTone('error');
        setMessage(throttleResult.message || 'Wait before requesting another sign-in email.');
        return;
      }

      const result = await signIn('email', {
        email: validation.email,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setMessageTone('error');
        setMessage('Email sign-in could not be started.');
        return;
      }

      setStep('code');
      setIdentifier(validation.email);
      setMessage(null);
    } catch (error) {
      console.error('Email request failed:', error);
      setMessageTone('error');
      setMessage('Email sign-in could not be started.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitIdentifier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (hasEmail) {
      await requestEmail(false);
      return;
    }

    setStep('password');
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await signIn('credentials', {
        username: identifier,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = callbackUrl;
        return;
      }

      setMessageTone('error');
      setMessage('Login failed.');
    } catch (error) {
      console.error('Credentials login failed:', error);
      setMessageTone('error');
      setMessage('Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const identifierField = (
    <input
      type="text"
      name="identifier"
      suppressHydrationWarning
      required
      value={identifier}
      disabled={isLoading}
      onChange={event => setIdentifier(event.target.value)}
      className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
      placeholder="username or name@example.com"
      autoComplete="username"
      autoFocus
      tabIndex={tabIndex > 0 ? tabIndex : undefined}
    />
  );

  const messageClassName =
    messageTone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200';
  const displayedMessage = message || (step === 'code' ? codeStepHelperText : null);
  const displayedMessageClassName = message ? messageClassName : 'text-gray-700 dark:text-gray-200';

  return (
    <div className="space-y-4">
      <p
        aria-live="polite"
        className={`flex min-h-10 items-end whitespace-pre-line text-sm font-medium ${
          displayedMessage ? displayedMessageClassName : 'text-transparent'
        }`}
      >
        {displayedMessage || ' '}
      </p>

      {step === 'identifier' ? (
        <form onSubmit={submitIdentifier} className="space-y-4" suppressHydrationWarning>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            {identifierField}
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg text-lg font-medium"
          >
            {isLoading ? 'Sending...' : emailPrimaryActionLabel}
          </Button>
          {hasCredentials ? (
            <Button
              type="button"
              disabled={isLoading}
              variant="link"
              className={secondaryLinkButtonClass}
              onClick={() => setStep('password')}
            >
              Continue with password
            </Button>
          ) : null}
        </form>
      ) : null}

      {step === 'password' ? (
        <form onSubmit={submitPassword} className="space-y-4" suppressHydrationWarning>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <input
              type="text"
              suppressHydrationWarning
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
              placeholder="username or name@example.com"
              autoComplete="username"
            />
            <input
              type="password"
              suppressHydrationWarning
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
              placeholder="password"
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg text-lg font-medium"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form
          action="/api/auth/email/verify-code"
          method="post"
          className="space-y-4"
          suppressHydrationWarning
        >
          <input type="hidden" name="email" value={identifier} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <input
              type="text"
              name="code"
              suppressHydrationWarning
              required
              inputMode="numeric"
              className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 bg-transparent"
              placeholder="Paste your verification code here"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-lg text-lg font-medium">
            Verify and Sign In
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading}
            className={`${secondaryLinkButtonClass} text-primary`}
            onClick={() => requestEmail(true)}
          >
            Send New Link
          </Button>
        </form>
      ) : null}

      <Button asChild variant="link" className={secondaryLinkButtonClass}>
        <Link href="/">Cancel</Link>
      </Button>
    </div>
  );
};
