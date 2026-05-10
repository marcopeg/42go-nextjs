"use client";

import { AppLayout } from "@/42go/layouts/app";
import type { Policy } from "@/42go/policy";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

type AppUser = {
  id: string;
  appId: string;
  username: string | null;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  appId: string;
  users: AppUser[];
};

const usersPolicy: Policy = {
  require: {
    feature: "page:users",
    session: true,
    role: "backoffice",
    grants: ["users:list"],
  },
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getDisplayName = (user: AppUser) =>
  user.name || user.username || user.email;

const CopyableValue = ({
  value,
  copied,
  className = "",
  children,
  onCopy,
}: {
  value: string;
  copied: boolean;
  className?: string;
  children: ReactNode;
  onCopy: (value: string) => Promise<void> | void;
}) => (
  <button
    type="button"
    className={`group inline-flex max-w-full items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${className}`}
    title={`Copy ${value}`}
    onClick={() => onCopy(value)}
  >
    <span className="min-w-0 truncate">{children}</span>
    {copied ? (
      <Check className="size-3 shrink-0 opacity-60" />
    ) : (
      <Copy className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" />
    )}
  </button>
);

const fetchUsersData = async (signal?: AbortSignal) => {
  const res = await fetch("/api/users", {
    credentials: "same-origin",
    signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(body?.message || body?.error || "Unable to load users");
  }

  return (await res.json()) as UsersResponse;
};

const UsersList = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [appId, setAppId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = useCallback(async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1200);
  }, []);

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const body = await fetchUsersData(signal);
      setUsers(body.users);
      setAppId(body.appId);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unable to load users");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadInitialUsers = async () => {
      try {
        const body = await fetchUsersData(controller.signal);
        setUsers(body.users);
        setAppId(body.appId);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load users");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadInitialUsers();
    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">All Users</h3>
          <p className="text-sm text-muted-foreground">
            {appId ? `${appId} app` : "Current app"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadUsers()}
          disabled={isLoading}
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 p-6 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-3">
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadUsers()}
            >
              <RefreshCw />
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase text-muted-foreground">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 rounded bg-muted" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-56 rounded bg-muted" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium">{getDisplayName(user)}</div>
                      {user.username ? (
                        <CopyableValue
                          value={user.username}
                          copied={copiedKey === `${user.id}:username`}
                          className="mt-0.5 text-xs text-muted-foreground"
                          onCopy={(value) =>
                            copyValue(`${user.id}:username`, value)
                          }
                        >
                          @{user.username}
                        </CopyableValue>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-56 flex-col items-start gap-0.5">
                        <CopyableValue
                          value={user.email}
                          copied={copiedKey === `${user.id}:email`}
                          className="text-muted-foreground"
                          onCopy={(value) =>
                            copyValue(`${user.id}:email`, value)
                          }
                        >
                          {user.email}
                        </CopyableValue>
                        <CopyableValue
                          value={user.id}
                          copied={copiedKey === `${user.id}:id`}
                          className="font-mono text-[10px] leading-3 text-muted-foreground/60"
                          onCopy={(value) => copyValue(`${user.id}:id`, value)}
                        >
                          {user.id}
                        </CopyableValue>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function UsersPage() {
  return (
    <AppLayout
      stickyHeader
      title="Users"
      subtitle="Manage your user accounts and permissions"
      policy={usersPolicy}
    >
      <UsersList />
    </AppLayout>
  );
}
