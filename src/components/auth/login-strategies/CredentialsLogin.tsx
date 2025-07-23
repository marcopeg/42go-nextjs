"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CredentialsLoginProps {
  isOtherLoading?: boolean;
  tabIndex?: number;
}

export function CredentialsLogin({
  isOtherLoading = false,
  tabIndex = 0,
}: CredentialsLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stacked Input Fields */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <input
          type="text"
          id="username"
          name="username"
          required
          disabled={isLoading || isOtherLoading}
          className="w-full px-4 py-3 border-0 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
          placeholder="username or name@example.com"
          tabIndex={tabIndex}
        />
        <input
          type="password"
          id="password"
          name="password"
          required
          disabled={isLoading || isOtherLoading}
          className="w-full px-4 py-3 border-0 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50 bg-transparent"
          placeholder="password"
          tabIndex={tabIndex + 1}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading || isOtherLoading}
        className="w-full h-12 rounded-lg text-lg font-medium"
        tabIndex={tabIndex + 2}
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
  );
}
