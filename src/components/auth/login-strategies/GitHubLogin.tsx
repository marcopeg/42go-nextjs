"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/ui/icons/github";
import { useState } from "react";

interface GitHubLoginProps {
  isOtherLoading?: boolean;
  tabIndex?: number;
}

export function GitHubLogin({
  isOtherLoading = false,
  tabIndex,
}: GitHubLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("github", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("GitHub sign-in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading || isOtherLoading}
      variant="outline"
      className="w-full h-11 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
      tabIndex={tabIndex}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
      ) : (
        <GitHubIcon size={20} />
      )}
      {isLoading ? "Connecting..." : "Continue with GitHub"}
    </Button>
  );
}
