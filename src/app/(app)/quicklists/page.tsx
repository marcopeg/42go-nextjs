"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { TActionItem } from "@/42go/layouts/app/types";
import { AppLayout } from "@/42go/layouts/app/AppLayout";

interface ProjectsResponse {
  projects: Array<{
    id: string;
    title: string;
    owned: boolean;
    role: string;
    updated_at: string;
  }>;
  invites: Array<{
    project_id: string;
    email: string;
    title: string;
    created_at: string;
  }>;
  nextCursor?: string;
}

const fetchProjects = async (cursor?: string): Promise<ProjectsResponse> => {
  const search = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const res = await fetch(`/api/quicklists${search}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json();
};

function Updated({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <span className="text-xs text-muted-foreground">{d.toLocaleString()}</span>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectsResponse["projects"]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
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
      const data = (await res.json()) as { id: string };
      router.push(`/quicklists/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const load = async (next?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects(next);
      setProjects((prev) =>
        next ? [...prev, ...data.projects] : data.projects
      );
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppLayout
      title="QuickList"
      subtitle="Todos made simple"
      actions={[
        {
          type: "component",
          component: ({ disabled }: { disabled?: boolean }) => (
            <Button
              onClick={handleCreate}
              disabled={creating || disabled}
              variant={"ghost"}
            >
              {creating ? "Creating…" : "+"}
            </Button>
          ),
        } as TActionItem,
      ]}
      policy={{ require: { feature: "page:quicklists" } }}
    >
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {projects.length === 0 && !loading ? (
          <div className="text-sm text-muted-foreground">No lists yet.</div>
        ) : (
          <ul className="divide-y rounded-md border">
            {projects.map((p) => (
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
                    <Updated iso={p.updated_at} />
                  </div>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-2">
          {cursor && (
            <button
              className="btn btn-secondary"
              onClick={() => load(cursor)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
