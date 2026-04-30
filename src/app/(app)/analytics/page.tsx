"use client";

import { useSession } from "next-auth/react";
import { AppLayout, type TActionItem } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  const headerActions: TActionItem[] = [
    {
      type: "component",
      component: Button,
      props: { size: "sm", children: "Export Data", variant: "outline" },
    },
  ];

  return (
    <AppLayout
      title="Analytics"
      subtitle="Track your performance metrics and insights"
      actions={headerActions}
      stickyHeader={true}
    >
      {/* Analytics Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6 bg-card">
          <h3 className="font-semibold mb-2">Page Views</h3>
          <p className="text-3xl font-bold text-accent">125,432</p>
          <p className="text-sm text-muted-foreground">+5.2% from last month</p>
        </div>
        <div className="rounded-lg border p-6 bg-card">
          <h3 className="font-semibold mb-2">Unique Visitors</h3>
          <p className="text-3xl font-bold text-accent">8,459</p>
          <p className="text-sm text-muted-foreground">+2.1% from last month</p>
        </div>
        <div className="rounded-lg border p-6 bg-card">
          <h3 className="font-semibold mb-2">Conversion Rate</h3>
          <p className="text-3xl font-bold text-accent">3.24%</p>
          <p className="text-sm text-muted-foreground">-0.3% from last month</p>
        </div>
      </div>

      <div className="rounded-lg border p-6 bg-card">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-2 text-sm">
          <p>📊 Analytics data refreshed</p>
          <p>📈 New report generated</p>
          <p>⚡ Performance optimized</p>
        </div>
      </div>
    </AppLayout>
  );
}
