"use client";

import { useSession, signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    return <p>Access Denied. Please log in.</p>;
  }

  return (
    <div className="dashboard-page">
      <h1>Welcome, {session?.user?.name}</h1>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
