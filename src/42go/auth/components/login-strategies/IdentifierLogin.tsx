'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getGenericInvalidEmailMessage, validateAuthEmail } from '@/42go/auth/lib/email/validation';
import {
  getIdentifierCancelTabIndex,
  getIndexedTabIndex,
  shouldUsePasswordForIdentifier,
} from '@/42go/auth/components/login-strategies/identifier-login-flow';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryError = searchParams?.get('error') || null;
  const queryEmail = searchParams?.get('email') || '';
  const queryErrorMessage = getEmailAuthErrorMessage(queryError);
  const shouldStartOnCodeStep = hasEmail && queryError === 'Verification' && Boolean(queryEmail);
  const [step, setStep] = useState<Step>(shouldStartOnCodeStep ? 'code' : 'identifier');
  const [identifier, setIdentifier] = useState(queryEmail);
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState<string | null>(queryErrorMessage);
  const [messageTone, setMessageTone] = useState<MessageTone>('error');
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const getTabIndex = (offset: number) => getIndexedTabIndex(tabIndex, offset);
  const cancelTabIndex = getIdentifierCancelTabIndex({
    baseTabIndex: tabIndex,
    hasCredentials,
    step,
  });

  useEffect(() => {
    if (step === 'password') {
      passwordInputRef.current?.focus();
    }
  }, [step]);

  const shouldUsePassword = () => {
    // A non-email identifier signals an intentional credentials login.
    return shouldUsePasswordForIdentifier({
      emailIsValid: validateAuthEmail(identifier).ok,
      hasCredentials,
      identifier,
    });
  };

  const showPasswordStep = () => {
    setMessage(null);
    setStep('password');
  };

  const cancelCodeStep = () => {
    setVerificationCode('');
    setMessage(null);
    setStep('identifier');

    if (queryError || queryEmail) {
      router.replace('/login', { scroll: false });
    }
  };

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

    if (shouldUsePassword()) {
      showPasswordStep();
      return;
    }

    if (hasEmail) {
      await requestEmail(false);
      return;
    }

    showPasswordStep();
  };

  const handleIdentifierKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const shouldAdvanceToPassword = event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey);
    if (!shouldAdvanceToPassword || !shouldUsePassword()) return;

    event.preventDefault();
    showPasswordStep();
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

  const verifyCode = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const verification = await fetch('/api/auth/email/verify-code', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl,
          code: verificationCode,
          email: identifier,
        }),
      });
      const result = await verification.json();

      if (!verification.ok || !result.ok || typeof result.callbackUrl !== 'string') {
        setMessageTone('error');
        setMessage(result.message || 'Invalid verification code.');
        return;
      }

      const authResult = await fetch(result.callbackUrl, {
        credentials: 'same-origin',
        redirect: 'follow',
      });
      const authResultUrl = new URL(authResult.url);

      if (
        !authResult.ok ||
        (authResultUrl.pathname === '/login' && authResultUrl.searchParams.has('error'))
      ) {
        setMessageTone('error');
        setMessage('Invalid verification code.');
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error('Email code verification failed:', error);
      setMessageTone('error');
      setMessage('Verification could not be completed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void verifyCode();
  };

  const handleVerificationCodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key !== 'Enter' ||
      event.nativeEvent.isComposing ||
      !verificationCode.trim() ||
      isLoading
    ) {
      return;
    }

    event.preventDefault();
    void verifyCode();
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
      onKeyDown={handleIdentifierKeyDown}
      className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
      placeholder="username or name@example.com"
      autoComplete="username"
      autoFocus
      tabIndex={getTabIndex(0)}
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
            tabIndex={getTabIndex(1)}
          >
            {isLoading ? 'Sending...' : emailPrimaryActionLabel}
          </Button>
          {hasCredentials ? (
            <Button
              type="button"
              disabled={isLoading}
              variant="link"
              className={secondaryLinkButtonClass}
              onClick={showPasswordStep}
              tabIndex={getTabIndex(2)}
            >
              Continue with password
            </Button>
          ) : null}
        </form>
      ) : null}

      {step === 'password' ? (
        <form onSubmit={submitPassword} className="space-y-4" suppressHydrationWarning>
          <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <input
              type="text"
              suppressHydrationWarning
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
              placeholder="username or name@example.com"
              autoComplete="username"
              tabIndex={getTabIndex(0)}
            />
            <input
              ref={passwordInputRef}
              type="password"
              suppressHydrationWarning
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
              placeholder="password"
              autoComplete="current-password"
              tabIndex={getTabIndex(1)}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-gray-300 dark:bg-gray-600"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg text-lg font-medium"
            tabIndex={getTabIndex(2)}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form onSubmit={submitCode} className="space-y-4" suppressHydrationWarning>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <input
              type="text"
              name="code"
              suppressHydrationWarning
              required
              inputMode="numeric"
              value={verificationCode}
              disabled={isLoading}
              onChange={event => setVerificationCode(event.target.value)}
              onKeyDown={handleVerificationCodeKeyDown}
              className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 bg-transparent"
              placeholder="Paste your verification code here"
              autoComplete="one-time-code"
              autoFocus
              tabIndex={getTabIndex(0)}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg text-lg font-medium"
            tabIndex={getTabIndex(1)}
          >
            {isLoading ? 'Verifying...' : 'Verify and Sign In'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading}
            className={`${secondaryLinkButtonClass} text-primary`}
            onClick={() => requestEmail(true)}
            tabIndex={getTabIndex(2)}
          >
            Send New Link
          </Button>
        </form>
      ) : null}

      {step === 'code' ? (
        <Button
          type="button"
          variant="neutralLink"
          disabled={isLoading}
          className={secondaryLinkButtonClass}
          onClick={cancelCodeStep}
          tabIndex={cancelTabIndex}
        >
          Cancel
        </Button>
      ) : (
        <Button
          asChild
          variant="neutralLink"
          className={secondaryLinkButtonClass}
          tabIndex={cancelTabIndex}
        >
          <Link href="/">Cancel</Link>
        </Button>
      )}
    </div>
  );
};
