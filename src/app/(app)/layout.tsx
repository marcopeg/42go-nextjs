"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (status === "unauthenticated") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            window.location.href = "/login";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You need to be logged in to access this page.
        </p>
        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
        <p className="text-sm text-muted-foreground mt-4">
          Redirecting to login page in {countdown} seconds...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
