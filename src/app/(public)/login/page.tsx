"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/ui/icons/github";
import { GoogleIcon } from "@/components/ui/icons/google";
import { AuthError } from "@/components/auth/AuthError";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const username = (event.target as HTMLFormElement).username.value;
    const password = (event.target as HTMLFormElement).password.value;

    try {
      const result = await signIn("credentials", {
        username,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = "/dashboard";
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

  const handleGitHubSignIn = async () => {
    setIsGitHubLoading(true);
    try {
      await signIn("github", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("GitHub sign-in error:", error);
      setIsGitHubLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="login-page max-w-md mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

      {/* Error Display */}
      <AuthError />

      {/* OAuth Section */}
      <div className="mb-6 space-y-3">
        <Button
          onClick={handleGitHubSignIn}
          disabled={isGitHubLoading || isGoogleLoading || isLoading}
          variant="outline"
          className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {isGitHubLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
          ) : (
            <GitHubIcon size={20} />
          )}
          {isGitHubLoading ? "Connecting..." : "Continue with GitHub"}
        </Button>

        <Button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isGitHubLoading || isLoading}
          variant="outline"
          className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {isGoogleLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
          ) : (
            <GoogleIcon size={20} />
          )}
          {isGoogleLoading ? "Connecting..." : "Continue with Google"}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
            Or continue with credentials
          </span>
        </div>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            required
            disabled={isLoading || isGitHubLoading || isGoogleLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            disabled={isLoading || isGitHubLoading || isGoogleLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
            placeholder="Enter your password"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || isGitHubLoading || isGoogleLoading}
          className="w-full h-11"
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
      </form>
    </div>
  );
}
