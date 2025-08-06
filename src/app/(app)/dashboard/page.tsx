"use client";

import { useSession } from "next-auth/react";
import { AppLayout, type AppLayoutActionItem } from "@/42go/layouts/app";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  // Use ContentBlock configuration for header actions
  const headerActions: AppLayoutActionItem[] = [
    {
      type: "link",
      label: "Sign Out",
      href: "/api/auth/signout",
      variant: "outline",
      size: "sm",
    },
  ];

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`Welcome back, ${session?.user?.name || "User"}!`}
      headerActions={headerActions}
      stickyHeader={true}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-6 bg-card">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-6 bg-card">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">342</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-6 bg-card">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">$12,345</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-6 bg-card">
            <div className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Growth</p>
                <p className="text-2xl font-bold">+12.5%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm">New user registration</span>
              <span className="text-xs text-muted-foreground">
                2 minutes ago
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm">Payment processed</span>
              <span className="text-xs text-muted-foreground">
                15 minutes ago
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Database backup completed</span>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
