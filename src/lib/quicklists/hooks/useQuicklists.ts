import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QuicklistMode } from "@/lib/quicklists/mode";

interface ProjectsResponse {
  projects: Array<{
    id: string;
    title: string;
    mode: QuicklistMode;
    owned: boolean;
    role: string;
    updated_at: string;
  }>;
  invites: Array<{
    project_id: string;
    email: string;
    title: string;
    created_at: string;
    owner_username: string;
    owner_email: string;
  }>;
  nextCursor?: string;
}

export interface ProjectData {
  etag: string | null;
  project: {
    id: string;
    title: string;
    mode: QuicklistMode;
    created_at?: string;
    updated_at: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    position: number;
    updated_at: string;
    completed_at: string | null;
  }>;
}

const fetchProjects = async (cursor?: string): Promise<ProjectsResponse> => {
  const search = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const res = await fetch(`/api/quicklists${search}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json();
};

const parseProjectResponse = async (res: Response): Promise<ProjectData> => {
  const data = (await res.json()) as Omit<ProjectData, "etag">;
  return {
    ...data,
    etag: res.headers.get("etag"),
  };
};

export const fetchProjectFull = async (
  projectId: string,
  signal?: AbortSignal
): Promise<ProjectData> => {
  const res = await fetch(`/api/quicklists/${projectId}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load project: ${res.status} ${res.statusText}`);
  }
  return parseProjectResponse(res);
};

export type ConditionalProjectResult =
  | { modified: false }
  | { modified: true; data: ProjectData };

export const fetchProjectConditional = async (
  projectId: string,
  etag: string | null,
  signal?: AbortSignal
): Promise<ConditionalProjectResult> => {
  const res = await fetch(`/api/quicklists/${projectId}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: etag ? { "If-None-Match": etag } : undefined,
    signal,
  });

  if (res.status === 304) return { modified: false };
  if (!res.ok) {
    throw new Error(`Failed to load project: ${res.status} ${res.statusText}`);
  }

  return {
    modified: true,
    data: await parseProjectResponse(res),
  };
};

export const QUICKLISTS_QUERY_KEY = ["quicklists"];
export const PROJECT_QUERY_KEY = (projectId: string) => ["project", projectId];

export function useQuicklists() {
  return useQuery({
    queryKey: QUICKLISTS_QUERY_KEY,
    queryFn: () => fetchProjects(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEY(projectId),
    queryFn: ({ signal }) => fetchProjectFull(projectId, signal),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!projectId,
  });
}

// Hook to manually refresh the quicklists cache
export function useRefreshQuicklists() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: QUICKLISTS_QUERY_KEY });
  };
}

// Hook to manually refresh a specific project cache
export function useRefreshProject(projectId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEY(projectId) });
  };
}

// Hook to update a specific project in the cache (for optimistic updates)
export function useUpdateProjectInCache() {
  const queryClient = useQueryClient();

  return (
    projectId: string,
    updates: { title?: string; mode?: QuicklistMode; updated_at?: string }
  ) => {
    queryClient.setQueryData(
      QUICKLISTS_QUERY_KEY,
      (oldData: ProjectsResponse | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          projects: oldData.projects.map((project) =>
            project.id === projectId ? { ...project, ...updates } : project
          ),
        };
      }
    );
  };
}

// Hook to invalidate cache when a project is updated elsewhere
export function useInvalidateQuicklistsOnProjectChange() {
  const queryClient = useQueryClient();

  return (
    projectId: string,
    newData: { title?: string; mode?: QuicklistMode; updated_at?: string }
  ) => {
    const currentData =
      queryClient.getQueryData<ProjectsResponse>(QUICKLISTS_QUERY_KEY);

    if (currentData) {
      const project = currentData.projects.find((p) => p.id === projectId);

      if (project) {
        // Check if title or updated_at has changed
        const titleChanged = newData.title && newData.title !== project.title;
        const updatedAtChanged =
          newData.updated_at && newData.updated_at !== project.updated_at;

        if (titleChanged || updatedAtChanged) {
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: QUICKLISTS_QUERY_KEY });
        }
      }
    }
  };
}

// Hook to invalidate project cache when tasks or project data changes
export function useInvalidateProjectCache() {
  const queryClient = useQueryClient();

  return (
    projectId: string,
    changes?: {
      title?: string;
      updated_at?: string;
      taskAdded?: boolean;
      taskUpdated?: boolean;
      taskDeleted?: boolean;
    }
  ) => {
    // Always invalidate the project cache when changes happen
    queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEY(projectId) });

    // If project title or updated_at changed, also invalidate the projects list
    if (
      changes?.title ||
      changes?.updated_at ||
      changes?.taskAdded ||
      changes?.taskUpdated ||
      changes?.taskDeleted
    ) {
      queryClient.invalidateQueries({ queryKey: QUICKLISTS_QUERY_KEY });
    }
  };
}

// Hook to remove a project from the cache (for optimistic deletion)
export function useRemoveProjectFromCache() {
  const queryClient = useQueryClient();

  return (projectId: string) => {
    queryClient.setQueryData(
      QUICKLISTS_QUERY_KEY,
      (oldData: ProjectsResponse | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          projects: oldData.projects.filter((project) => project.id !== projectId),
          invites: oldData.invites.filter((invite) => invite.project_id !== projectId),
        };
      }
    );

    // Also remove the individual project cache
    queryClient.removeQueries({ queryKey: PROJECT_QUERY_KEY(projectId) });
  };
}
