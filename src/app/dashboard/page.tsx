"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
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
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="access-denied">
        <h1>Access Denied</h1>
        <p>You need to be logged in to access this page.</p>
        <p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Click here to login
          </Link>
        </p>
        <p className="text-gray-600 mt-4">
          Redirecting to login page in {countdown} seconds...
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1>Welcome, {session?.user?.name}</h1>
      <button onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
    </div>
  );
}
