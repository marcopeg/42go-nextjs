"use client";

import { Button } from "@/components/ui/button";
import { AppLayout } from "@/42go/layouts/app/AppLayout";
import { ListTodo, RotateCcw } from "lucide-react";
import {
  ProjectListSkeleton,
  ProjectListErrorState,
} from "@/lib/quicklists/components/ProjectListSkeleton";
import { useQuicklistsData } from "@/lib/quicklists/hooks/useQuicklistsData";
import { ProjectsList } from "@/lib/quicklists/components/ProjectsList";
import { useQuicklistPreference } from "@/lib/quicklists/hooks/useQuicklistPreference";
import { NotificationCenter } from "@/42go/components/Notifications";

export default function ProjectsPage() {
  useQuicklistPreference();

  const {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch,
    creating,
    busyInvite,
    handleRefresh,
    handleCreate,
    handleJoin,
    handleReject,
  } = useQuicklistsData();

  const RefreshButton = () => (
    <Button
      onClick={() => void handleRefresh()}
      size="sm"
      variant="outline"
      aria-label="Refresh projects"
      aria-busy={isRefreshing}
      disabled={isRefreshing}
    >
      <RotateCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
        <NotificationCenter className="mx-4 mb-4 md:mx-6" />
        {isLoading && <ProjectListSkeleton />}

        {!!error && (
          <ProjectListErrorState
            error={error instanceof Error ? error.message : String(error)}
            onRetry={() => void refetch()}
          />
        )}

        {data && (
          <>
            {/* Projects list using extracted component */}
            <ProjectsList
              data={data}
              busyInvite={busyInvite}
              onAcceptInvite={handleJoin}
              onRejectInvite={handleReject}
            />

            {/* Add new list button - separated by divider */}
            <div className="px-4 md:px-6">
              <div className="border-t my-6"></div>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full"
                size="lg"
              >
                {creating
                  ? "Creating…"
                  : data.projects.length === 0
                    ? "Create your first list"
                    : "Create new list"}
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
