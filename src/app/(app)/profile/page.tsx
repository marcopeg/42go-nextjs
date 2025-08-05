"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/42go/layouts/app";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  return (
    <AppLayout
      title="Profile"
      subtitle="Manage your account settings and preferences"
      stickyHeader={true}
    >
      {/* Profile Content */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground mt-1">
                {session?.user?.name || "Not provided"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground mt-1">
                {session?.user?.email || "Not provided"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Member Since</label>
              <p className="text-sm text-muted-foreground mt-1">January 2024</p>
            </div>
            <Button className="w-full">Edit Profile</Button>
          </div>
        </div>

        <div className="rounded-lg border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground mt-1">System</p>
            </div>
            <div>
              <label className="text-sm font-medium">Language</label>
              <p className="text-sm text-muted-foreground mt-1">English</p>
            </div>
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <p className="text-sm text-muted-foreground mt-1">UTC</p>
            </div>
            <Button variant="outline" className="w-full">
              Update Preferences
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your account password
              </p>
            </div>
            <Button variant="outline">Change</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
