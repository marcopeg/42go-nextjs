"use client";

import { useSession } from "next-auth/react";

import { SimplePanel } from "@/42go/components/panel";
import { Button } from "@/components/ui/button";

type TestRBACProps = {
  title?: string;
};

export const TestRBAC = ({ title = "RBAC Session" }: TestRBACProps) => {
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
      // Best-effort diagnostic refresh.
    }
  };

  if (status === "loading") return null;

  return (
    <SimplePanel
      title={title}
      actions={
        <Button variant="outline" onClick={handleRefresh}>
          Refresh Session
        </Button>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">User ID</label>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {userId || "-"}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">App ID</label>
          <p className="mt-1 text-sm text-muted-foreground">{appId}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Roles</label>
          {roles.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">-</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Grants</label>
          {grants.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">-</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {grants.map((grant) => (
                <li key={grant}>{grant}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SimplePanel>
  );
};
