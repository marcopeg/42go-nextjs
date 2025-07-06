import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthErrorProps {
  className?: string;
}

export function AuthError({ className }: AuthErrorProps) {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "OAuthSignin":
          setError("Error occurred during GitHub sign-in. Please try again.");
          break;
        case "OAuthCallback":
          setError("Error occurred during GitHub callback. Please try again.");
          break;
        case "OAuthCreateAccount":
          setError("Could not create account with GitHub. Please try again.");
          break;
        case "EmailCreateAccount":
          setError("Could not create account with this email address.");
          break;
        case "Callback":
          setError("Error occurred during authentication. Please try again.");
          break;
        case "OAuthAccountNotLinked":
          setError(
            "This GitHub account is already linked to another user account."
          );
          break;
        case "EmailSignin":
          setError(
            "Error occurred during email sign-in. Please check your credentials."
          );
          break;
        case "CredentialsSignin":
          setError("Invalid username or password. Please try again.");
          break;
        case "SessionRequired":
          setError("Please sign in to access this page.");
          break;
        default:
          setError("Authentication error occurred. Please try again.");
      }
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
