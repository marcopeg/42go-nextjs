"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

interface AuthErrorProps {
  className?: string;
}

export function AuthError({ className }: AuthErrorProps) {
  const searchParams = useSearchParams();

  const error = useMemo(() => {
    const errorParam = searchParams?.get("error");
    if (!errorParam) return null;

    switch (errorParam) {
      case "OAuthSignin":
        return "Error occurred during GitHub sign-in. Please try again.";
      case "OAuthCallback":
        return "Error occurred during GitHub callback. Please try again.";
      case "OAuthCreateAccount":
        return "Could not create account with GitHub. Please try again.";
      case "EmailCreateAccount":
        return "Could not create account with this email address.";
      case "Callback":
        return "Error occurred during authentication. Please try again.";
      case "OAuthAccountNotLinked":
        return "This GitHub account is already linked to another user account.";
      case "EmailSignin":
        return "Error occurred during email sign-in. Please check your credentials.";
      case "CredentialsSignin":
        return "Invalid username or password. Please try again.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      default:
        return "Authentication error occurred. Please try again.";
    }
  }, [searchParams]);

  if (!error) return null;

  return (
    <div
      className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-4 ${className}`}
    >
      <div className="flex items-start">
        <svg
          className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm">{error}</span>
      </div>
    </div>
  );
}
