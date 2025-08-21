import { useQuery, useQueryClient } from "@tanstack/react-query";

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
    owner_username: string;
    owner_email: string;
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

export const QUICKLISTS_QUERY_KEY = ["quicklists"];

export function useQuicklists() {
  return useQuery({
    queryKey: QUICKLISTS_QUERY_KEY,
    queryFn: () => fetchProjects(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook to manually refresh the quicklists cache
export function useRefreshQuicklists() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: QUICKLISTS_QUERY_KEY });
  };
}

// Hook to update a specific project in the cache (for optimistic updates)
export function useUpdateProjectInCache() {
  const queryClient = useQueryClient();

  return (
    projectId: string,
    updates: { title?: string; updated_at?: string }
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
    newData: { title?: string; updated_at?: string }
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
