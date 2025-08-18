"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogoutAction } from "@/42go/auth/components/LogoutAction";
import { AppLayout } from "@/42go/layouts/app";
import { SimplePanel } from "@/42go/components/panel";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  return (
    <AppLayout
      title="Profile"
      stickyHeader={true}
      actions={[
        {
          type: "component",
          component: LogoutAction,
        },
      ]}
      // Demo: require read grant to show a special section
      // Note: page itself is unprotected here; only the inner section is guarded
    >
      {/* Profile Content */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <SimplePanel title="Account Information">
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
        </SimplePanel>
      </div>

      {/* Guarded content now via SimplePanel policy prop */}
      <SimplePanel
        title="Special Data"
        policy={{ require: { anyGrant: ["profile:read"] } }}
        renderOnLoading={() => null}
        renderOnError={() => null}
        className="mt-6"
      >
        <p className="text-sm text-muted-foreground">
          You can see this because you have profile:read.
        </p>
      </SimplePanel>

      <PolicySessionPanel />
    </AppLayout>
  );
}

function PolicySessionPanel() {
  const { data: rawSession, status, update } = useSession();
  const user = rawSession?.user as unknown as {
    id?: string;
    grants?: string[];
    roles?: string[];
    appId?: string;
  };
  const userId = user?.id;
  const roles = user?.roles || [];
  const grants = user?.grants || [];
  const appId = user?.appId || "default";

  const handleRefresh = async () => {
    try {
      await update({ rbacRefresh: true });
    } catch {
      // noop: best-effort refresh
    }
  };

  // Logout moved to top bar via LogoutAction component

  if (status === "loading") return null;

  return (
    <SimplePanel
      title="RBAC Session"
      actions={
        <>
          <Button variant="outline" onClick={handleRefresh}>
            Refresh Session
          </Button>
        </>
      }
      className="mt-6"
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">User ID</label>
          <p className="text-sm text-muted-foreground mt-1 break-all">
            {userId || "—"}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">App ID</label>
          <p className="text-sm text-muted-foreground mt-1">{appId}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Roles</label>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-1">—</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
              {roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Grants</label>
          {grants.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-1">—</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
              {grants.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SimplePanel>
  );
}
