"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { DisplayDate } from "@/42go/components/DisplayDate";
import { ChevronRight, ChevronDown, ListTodo, RotateCcw } from "lucide-react";
import * as RadixPopover from "@radix-ui/react-popover";
import { useQuicklists, useRefreshQuicklists } from "@/hooks/useQuicklists";
import {
  ProjectListSkeleton,
  ProjectListErrorState,
} from "@/components/quicklists/ProjectListSkeleton";

export default function ProjectsPage() {
  const { data, isLoading, error, refetch } = useQuicklists();
  const refreshQuicklists = useRefreshQuicklists();
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const handleRefresh = () => {
    refreshQuicklists();
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/quicklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Explicitly match spec: create default list with two tasks
        body: JSON.stringify({
          title: "New list",
          tasks: ["Task 1", "Task 2"],
        }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Create failed (${res.status})`);
      }
      const resp = (await res.json()) as { id: string };

      // Invalidate cache to show the new project
      refreshQuicklists();

      router.push(`/quicklists/${resp.id}`);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: e instanceof Error ? e.message : "Failed to create list",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (projectId: string) => {
    setBusyInvite(projectId);
    try {
      const res = await fetch(`/api/quicklists/${projectId}/collabs`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Join failed (${res.status})`);
      }

      // Invalidate cache to show the joined project
      refreshQuicklists();

      router.push(`/quicklists/${projectId}`);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Join failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusyInvite(null);
    }
  };

  const RefreshButton = () => (
    <Button
      onClick={handleRefresh}
      size="sm"
      variant="outline"
      aria-label="Refresh projects"
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  );

  const actions = [
    {
      type: "component" as const,
      component: RefreshButton,
    },
  ];

  return (
    <AppLayout
      icon={ListTodo}
      title="QuickList"
      subtitle="Todos made simple"
      disablePadding
      actions={actions}
      policy={{ require: { feature: "page:quicklists" } }}
    >
      {/* Align list with header on desktop; no horizontal padding on mobile */}
      <div className="max-w-3xl w-full pt-2 pb-24 md:pb-0 px-0">
        {isLoading && <ProjectListSkeleton />}

        {error && (
          <ProjectListErrorState
            error={error instanceof Error ? error.message : "Unknown error"}
            onRetry={() => refetch()}
          />
        )}

        {data && (
          <>
            {/* Projects list container */}
            <div className="overflow-hidden md:border md:rounded-md md:mx-6 md:mt-6 md:mb-6">
              {/* Unified list: invitations and projects */}
              {data.invites.length > 0 || data.projects.length > 0 ? (
                <ul className="divide-y">
                  {/* Invitations first */}
                  {data.invites.map((invite) => (
                    <li
                      key={invite.project_id + invite.email}
                      className="p-3 flex items-center justify-between hover:bg-muted/20"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {invite.title}
                          <span className="ml-2 text-xs rounded px-2 py-0.5 bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 border border-yellow-600/30">
                            invite
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <DisplayDate date={invite.created_at} />
                          <span className="text-muted-foreground">|</span>
                          <span>invited by:</span>
                          <span className="relative group font-medium text-muted-foreground cursor-pointer">
                            {invite.owner_username}
                            <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-10 hidden group-hover:block bg-popover text-xs text-muted-foreground px-2 py-1 rounded shadow-lg border">
                              {invite.owner_email}
                            </span>
                          </span>
                        </div>
                      </div>
                      <SplitAcceptReject
                        busy={busyInvite === invite.project_id}
                        onAccept={() => handleJoin(invite.project_id)}
                        onReject={() =>
                          handleReject(invite.project_id, invite.email)
                        }
                      />
                    </li>
                  ))}
                  {/* Projects */}
                  {data.projects.map((p) => (
                    <li key={p.id} className="p-3 hover:bg-muted/20">
                      <Link
                        href={`/quicklists/${p.id}`}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">
                            {p.title}{" "}
                            {p.owned ? (
                              <span className="ml-2 text-xs rounded px-2 py-0.5 bg-green-600/15 text-green-700 dark:text-green-400 border border-green-600/30">
                                owner
                              </span>
                            ) : (
                              <span className="ml-2 text-xs rounded px-2 py-0.5 bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/30">
                                {p.role}
                              </span>
                            )}
                          </div>
                          <DisplayDate
                            date={p.updated_at}
                            className="text-xs text-muted-foreground"
                          />
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No lists yet</p>
                  <p className="text-sm">
                    Create your first list to get started
                  </p>
                </div>
              )}
            </div>

            {/* Add new list button - separated by divider */}
            <div className="px-4 md:px-6">
              <div className="border-t my-6"></div>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full"
                size="lg"
              >
                {creating ? "Creating…" : "Add new list"}
              </Button>
            </div>

            {/* Load more button - TODO: Implement pagination with React Query */}
            {data.nextCursor && (
              <div className="px-4 md:px-6 pt-4">
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => {
                    // TODO: Implement load more with infinite query
                    console.log(
                      "Load more not implemented with pagination yet"
                    );
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function SplitAcceptReject({
  busy,
  onAccept,
  onReject,
}: {
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex rounded border border-green-600 overflow-hidden">
      <button
        type="button"
        className="btn btn-outline rounded-none flex items-center text-green-600 hover:bg-green-600/10 px-2 py-1 text-xs border-none"
        onClick={onAccept}
        disabled={busy}
      >
        {busy ? "Joining…" : "Accept"}
      </button>
      <RadixPopover.Root open={open} onOpenChange={setOpen}>
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            className="btn btn-outline rounded-none px-2 border-l border-green-600 flex items-center text-green-600 border-none"
            aria-label="More actions"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </RadixPopover.Trigger>
        <RadixPopover.Content
          sideOffset={4}
          align="end"
          className="bg-popover border rounded shadow-lg p-0 w-40 z-50"
        >
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-600/10 border-b border-gray-100 last:border-b-0"
            onClick={() => {
              onReject();
              setOpen(false);
            }}
          >
            Reject invite
          </button>
        </RadixPopover.Content>
      </RadixPopover.Root>
    </div>
  );
}

function handleReject(projectId: string, email: string) {
  // TODO: Implement API call to reject invite
  // For now, just show a toast
  // You can wire up the real API as needed
  // Example:
  // fetch(`/api/quicklists/${projectId}/invites/${email}`, { method: "DELETE", credentials: "same-origin" })
  //   .then(res => { if (!res.ok) throw new Error("Failed to reject invite"); })
  //   .catch(e => toast({ variant: "destructive", title: "Reject failed", description: e.message }));
  alert(`Invite rejected (implement real logic) ${projectId}, ${email}`);
}
