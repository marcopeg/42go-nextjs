"use client";

import { signIn } from "next-auth/react";
import { getIndexedTabIndex } from "@/42go/auth/components/login-strategies/identifier-login-flow";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CredentialsLoginProps {
  isOtherLoading?: boolean;
  tabIndex?: number;
  /** Redirect target passed from server login page. */
  callbackUrl: string;
}

export function CredentialsLogin({
  isOtherLoading = false,
  tabIndex = 0,
  callbackUrl,
}: CredentialsLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const username = (event.target as HTMLFormElement).username.value;
    const password = (event.target as HTMLFormElement).password.value;

    try {
      const result = await signIn("credentials", {
        username,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.ok) {
        // SPA navigation to avoid full page reload
        router.replace(callbackUrl);
        router.refresh();
      } else {
        alert("Login failed!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
      {/* Stacked Input Fields */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <input
          type="text"
          id="username"
          name="username"
          suppressHydrationWarning
          required
          disabled={isLoading || isOtherLoading}
          className="w-full px-4 py-3 border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
          placeholder="username or name@example.com"
          autoComplete="username"
          autoFocus
          tabIndex={getIndexedTabIndex(tabIndex, 0)}
        />
        <input
          type="password"
          id="password"
          name="password"
          suppressHydrationWarning
          required
          disabled={isLoading || isOtherLoading}
          className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
          placeholder="password"
          autoComplete="current-password"
          tabIndex={getIndexedTabIndex(tabIndex, 1)}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading || isOtherLoading}
        className="w-full h-12 rounded-lg text-lg font-medium"
        tabIndex={getIndexedTabIndex(tabIndex, 2)}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
      <Button
        asChild
        variant="neutralLink"
        className="w-full h-12 rounded-lg text-lg font-medium"
        tabIndex={getIndexedTabIndex(tabIndex, 3)}
      >
        <Link href="/">Cancel</Link>
      </Button>
    </form>
  );
}
