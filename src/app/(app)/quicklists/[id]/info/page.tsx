"use client";

import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { useParams, useRouter } from "next/navigation";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

import { useSession } from "next-auth/react";
import { DisplayDate } from "@/42go/components/DisplayDate";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Invite = {
  email: string;
  created_at: string | null;
  created_by: string;
  expires_at: string | null;
  is_internal?: boolean;
};

type Collab = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string | null;
};

type InfoResponse = {
  etag: string;
  project: {
    id: string;
    title: string;
    created_at: string | null;
    updated_at: string | null;
    is_owner: boolean;
  };
  invites: Invite[];
  collabs: Collab[];
};

// Tooltip for email on hover/touch (renders via portal to avoid clipping)
function EmailTooltip({ name, email }: { name: string; email: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!show) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  }, [show]);

  return (
    <>
      <span
        ref={anchorRef}
        className="cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onTouchStart={() => setShow(true)}
        onTouchEnd={() => setTimeout(() => setShow(false), 2000)}
        tabIndex={0}
        aria-label={email}
      >
        {name}
      </span>
      {show && pos && typeof window !== "undefined"
        ? createPortal(
            <span
              className="fixed z-50 -translate-x-1/2 px-2 py-1 rounded bg-neutral-800 text-xs text-white shadow-lg whitespace-nowrap"
              style={{
                top: pos.top,
                left: pos.left,
                minWidth: 120,
                pointerEvents: "none",
              }}
              role="tooltip"
            >
              {email}
            </span>,
            document.body
          )
        : null}
    </>
  );
}

export default function QuicklistInfoPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const { data: session } = useSession();
  const idParam = params?.id;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam || "";

  const [data, setData] = useState<InfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/quicklists/${projectId}/info`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = (await res.json()) as InfoResponse;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load info");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const overLimit = useMemo(() => {
    const total = (data?.invites?.length || 0) + (data?.collabs?.length || 0);
    return total >= 10;
  }, [data?.invites?.length, data?.collabs?.length]);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/quicklists/${projectId}/info`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as InfoResponse;
      setData(json);
    } catch {}
  }, [projectId]);

  // Recursively search for a 'message' field in any nested object/array
  function extractMessage(obj: unknown): string | undefined {
    if (!obj) return undefined;
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const msg = extractMessage(item);
        if (msg) return msg;
      }
      return undefined;
    }
    if (typeof obj === "object" && obj !== null) {
      if (
        "message" in obj &&
        typeof (obj as { message?: unknown }).message === "string"
      ) {
        return (obj as { message: string }).message;
      }
      for (const key of Object.keys(obj)) {
        const value = (obj as Record<string, unknown>)[key];
        const msg = extractMessage(value);
        if (msg) return msg;
      }
    }
    return undefined;
  }

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/quicklists/${projectId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let msg = `${res.status}`;
        try {
          const data = await res.json();
          const deepMsg = extractMessage(data);
          if (deepMsg) msg = deepMsg;
        } catch {}
        setError(msg);
        return;
      }
      setInviteEmail("");
      setError(null);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const revokeInvite = useCallback(
    async (email: string) => {
      if (typeof window !== "undefined") {
        const ok = window.confirm(
          `Are you sure you want to revoke the invite for ${email}? This cannot be undone.`
        );
        if (!ok) return;
      }
      try {
        setBusyKey(`invite:${email}`);
        await fetch(
          `/api/quicklists/${projectId}/invites/${encodeURIComponent(email)}`,
          { method: "DELETE", credentials: "same-origin" }
        );
        await refresh();
      } finally {
        setBusyKey(null);
      }
    },
    [projectId, refresh]
  );

  const removeCollab = useCallback(
    async (userId: string) => {
      try {
        setBusyKey(`collab:${userId}`);
        await fetch(`/api/quicklists/${projectId}/collabs/${userId}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        await refresh();
      } finally {
        setBusyKey(null);
      }
    },
    [projectId, refresh]
  );

  const leaveProject = async () => {
    if (!session?.user?.id) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Are you sure you want to leave this list? You will lose access."
      );
      if (!ok) return;
    }
    try {
      setLeaving(true);
      const res = await fetch(
        `/api/quicklists/${projectId}/collabs/${session.user.id}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      if (!res.ok) {
        try {
          const j = await res.json();
          const msg =
            (j && (j.message || j.error)) || `Leave failed (${res.status})`;
          setError(String(msg));
        } catch {
          setError(`Leave failed (${res.status})`);
        }
        return;
      }
      router.push("/quicklists");
    } finally {
      setLeaving(false);
    }
  };

  const title = useMemo(
    () => data?.project?.title || "Collaborators",
    [data?.project?.title]
  );
  const subtitle = useMemo(() => {
    if (!data?.project?.updated_at) return undefined;
    return `Updated: ${new Date(data.project.updated_at).toLocaleString()}`;
  }, [data?.project?.updated_at]);

  // Merge and sort collabs and invites
  const mergedList = useMemo(() => {
    if (!data) return [];
    const collabRows = data.collabs.map((c) => ({
      type: "collab" as const,
      key: `collab:${c.user_id}`,
      name: c.name || c.user_id,
      email: c.email,
      date: c.created_at,
      is_internal: true,
      action: () => {
        if (typeof window !== "undefined") {
          const ok = window.confirm(
            `Are you sure you want to remove collaborator ${
              c.name || c.user_id
            }? This cannot be undone.`
          );
          if (!ok) return;
        }
        removeCollab(c.user_id);
      },
      canRevoke: data.project.is_owner,
      info: (
        <>
          <EmailTooltip name={c.name || c.user_id} email={c.email} />
          <div className="text-xs text-muted-foreground mt-1">
            <DisplayDate date={c.created_at} />
          </div>
        </>
      ),
      busy: busyKey === `collab:${c.user_id}`,
    }));
    const inviteRows = data.invites.map((inv) => ({
      type: inv.is_internal
        ? ("invite-internal" as const)
        : ("invite-external" as const),
      key: `invite:${inv.email}`,
      name: inv.email,
      email: inv.email,
      date: inv.created_at,
      is_internal: !!inv.is_internal,
      action: () => revokeInvite(inv.email),
      canRevoke: data.project.is_owner,
      info: (
        <>
          <div>{inv.email}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <DisplayDate date={inv.created_at} />
          </div>
        </>
      ),
      busy: busyKey === `invite:${inv.email}`,
    }));
    return [...collabRows, ...inviteRows].sort((a, b) => {
      const aName = a.name?.toLowerCase() || "";
      const bName = b.name?.toLowerCase() || "";
      return aName.localeCompare(bName);
    });
  }, [data, busyKey, removeCollab, revokeInvite]);

  // Icon color logic
  function renderIcon(type: "collab" | "invite-internal" | "invite-external") {
    if (type === "collab") {
      return (
        <span
          title="Active collaboration"
          aria-label="Active collaboration"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        >
          ●
        </span>
      );
    }
    if (type === "invite-internal") {
      return (
        <span
          title="Invite to user"
          aria-label="Invite to user"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          ●
        </span>
      );
    }
    // invite-external
    return (
      <span
        title="Invite to external email"
        aria-label="Invite to external email"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      >
        ●
      </span>
    );
  }

  return (
    <AppLayout
      hideMobileMenu
      backBtn={{ to: `/quicklists/${projectId}` }}
      policy={{ require: { feature: "page:quicklists" } }}
      title={title}
      subtitle={subtitle}
    >
      <div className="max-w-3xl w-full space-y-8">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && (
          <>
            <section>
              <h2 className="text-base font-semibold mb-2">
                Collaborators & Invitations
              </h2>
              {mergedList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No collaborators or invites
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2 w-8">&nbsp;</th>
                        <th className="text-left p-2">Info</th>
                        {data.project.is_owner && (
                          <th className="text-right p-2">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {mergedList.map((row) => (
                        <tr key={row.key} className="border-t">
                          <td className="p-2 align-top">
                            {renderIcon(row.type)}
                          </td>
                          <td className="p-2 align-top">{row.info}</td>
                          {data.project.is_owner && (
                            <td className="p-2 text-right align-top">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={row.action}
                                disabled={row.busy}
                                title={
                                  row.type === "collab"
                                    ? "Remove collaborator"
                                    : "Revoke invitation"
                                }
                                aria-label={
                                  row.type === "collab"
                                    ? "Remove collaborator"
                                    : "Revoke invitation"
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Invite form (owners only) */}
            {data.project.is_owner && !overLimit && (
              <section className="pt-2">
                <h3 className="text-base font-semibold mb-2">Add invitation</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !submitting &&
                        inviteEmail.trim().length > 0
                      ) {
                        e.preventDefault();
                        handleInvite();
                      }
                    }}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={submitting || inviteEmail.trim().length === 0}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    Invite
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </section>
            )}

            {/* Leave button for collaborators (non-owners) */}
            {!data.project.is_owner && (
              <section className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-500 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={leaveProject}
                  disabled={leaving || !session?.user?.id}
                >
                  Leave this list
                </Button>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
