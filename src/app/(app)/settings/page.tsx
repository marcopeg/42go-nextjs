"use client";

import { useSession } from "next-auth/react";
import { AppLayout, type AppLayoutActionItem } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  const headerActions: AppLayoutActionItem[] = [
    {
      type: "component",
      component: Button,
      props: { size: "sm", children: "Save Changes" },
    },
  ];

  return (
    <AppLayout
      title="Settings"
      subtitle="Configure your application settings and preferences"
      headerActions={headerActions}
      stickyHeader={true}
    >
      {/* Settings Content */}
      <div className="space-y-6">
        <div className="rounded-lg border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">General Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your account
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enabled
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Button variant="outline" size="sm">
                Disabled
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-save</p>
                <p className="text-sm text-muted-foreground">
                  Automatically save your work
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enabled
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme
                </p>
              </div>
              <select className="border rounded px-3 py-1 bg-background">
                <option>System</option>
                <option>Light</option>
                <option>Dark</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sidebar</p>
                <p className="text-sm text-muted-foreground">
                  Sidebar default state
                </p>
              </div>
              <select className="border rounded px-3 py-1 bg-background">
                <option>Expanded</option>
                <option>Collapsed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Data & Privacy</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your data
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive">Delete</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
