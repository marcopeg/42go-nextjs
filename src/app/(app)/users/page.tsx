"use client";

import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  return (
    <AppLayout
      stickyHeader
      title="Users"
      subtitle="Manage your user accounts and permissions"
      actions={[
        {
          type: "component",
          component: Button,
          props: { size: "sm", children: "Add New User" },
        },
      ]}
    >
      {/* Users Content */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">All Users</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">John Doe</p>
                <p className="text-sm text-muted-foreground">
                  john@example.com
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">
                  Active
                </span>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Jane Smith</p>
                <p className="text-sm text-muted-foreground">
                  jane@example.com
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">
                  Active
                </span>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Mike Johnson</p>
                <p className="text-sm text-muted-foreground">
                  mike@example.com
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 px-2 py-1 rounded">
                  Pending
                </span>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
