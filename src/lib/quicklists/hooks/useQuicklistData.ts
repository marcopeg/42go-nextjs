"use client";

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast";
import { useQuicklistPolling } from "@/lib/quicklists/hooks/useQuicklistPolling";
import { useQuicklistPreference } from "@/lib/quicklists/hooks/useQuicklistPreference";
import {
  fetchProjectFull,
  PROJECT_QUERY_KEY,
  type ProjectData,
  useProject,
  useRefreshQuicklists,
  useUpdateProjectInCache,
} from "@/lib/quicklists/hooks/useQuicklists";

export type Task = ProjectData["tasks"][0];

export interface UseQuicklistDataProps {
  projectId: string;
}

export interface UseQuicklistDataReturn {
  projectData: ProjectData | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
  refetch: () => Promise<void>;

  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  listTitle: string;
  setListTitle: Dispatch<SetStateAction<string>>;

  movingDownIds: Set<string>;
  setMovingDownIds: Dispatch<SetStateAction<Set<string>>>;

  handleToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<boolean>;
  handleCreateTask: (
    projectId: string,
    title: string,
    position: number
  ) => Promise<Task>;
  handleBulkCreateTasks: (
    titles: string[],
    afterId: string | null
  ) => Promise<Task[]>;
  handleUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  handleReorderTasks: (taskIds: string[]) => Promise<void>;
  handleUpdateProject: (
    updates: Partial<ProjectData["project"]>
  ) => Promise<void>;

  refreshData: () => Promise<void>;
  hasCompleted: boolean;
  handleDropCompleted: () => Promise<void>;
}

export const useQuicklistData = ({
  projectId,
}: UseQuicklistDataProps): UseQuicklistDataReturn => {
  const { data: projectData, isLoading, error } = useProject(projectId);
  const queryClient = useQueryClient();
  const updateProjectInCache = useUpdateProjectInCache();
  const refreshQuicklists = useRefreshQuicklists();
  const { level: autoRefreshLevel } = useQuicklistPreference();
  const { toast } = useToast();

  const [movingDownIds, setMovingDownIds] = useState<Set<string>>(new Set());
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [pendingMutationCount, setPendingMutationCount] = useState(0);
  const manualRefreshRef = useRef(false);
  const mutationEpochRef = useRef(0);
  const pendingMutationsRef = useRef(0);

  const applyProjectData = useCallback(
    (data: ProjectData) => {
      queryClient.setQueryData(PROJECT_QUERY_KEY(projectId), data);
    },
    [projectId, queryClient]
  );

  const updateProjectData = useCallback(
    (updater: (current: ProjectData) => ProjectData) => {
      queryClient.setQueryData<ProjectData>(
        PROJECT_QUERY_KEY(projectId),
        (current) => (current ? updater(current) : current)
      );
    },
    [projectId, queryClient]
  );

  const setResolvedTasks: Dispatch<SetStateAction<Task[]>> = useCallback(
    (value) => {
      updateProjectData((current) => {
        const nextTasks =
          typeof value === "function"
            ? (value as (previous: Task[]) => Task[])(current.tasks)
            : value;
        return { ...current, etag: null, tasks: nextTasks };
      });
    },
    [updateProjectData]
  );

  const setResolvedListTitle: Dispatch<SetStateAction<string>> = useCallback(
    (value) => {
      updateProjectData((current) => {
        const nextTitle =
          typeof value === "function"
            ? (value as (previous: string) => string)(current.project.title)
            : value;
        return {
          ...current,
          etag: null,
          project: { ...current.project, title: nextTitle },
        };
      });
    },
    [updateProjectData]
  );

  const beginMutation = useCallback(() => {
    mutationEpochRef.current += 1;
    pendingMutationsRef.current += 1;
    setPendingMutationCount((current) => current + 1);
    let finished = false;

    return () => {
      if (finished) return;
      finished = true;
      pendingMutationsRef.current = Math.max(
        0,
        pendingMutationsRef.current - 1
      );
      setPendingMutationCount((current) => Math.max(0, current - 1));
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (!projectId || manualRefreshRef.current || pendingMutationsRef.current > 0) {
      return;
    }

    manualRefreshRef.current = true;
    setManualRefreshing(true);
    mutationEpochRef.current += 1;
    const mutationEpoch = mutationEpochRef.current;

    try {
      const data = await fetchProjectFull(projectId);
      if (mutationEpoch === mutationEpochRef.current) {
        applyProjectData(data);
      }
    } catch (refreshError) {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description:
          refreshError instanceof Error
            ? refreshError.message
            : "Could not refresh this list.",
      });
    } finally {
      manualRefreshRef.current = false;
      setManualRefreshing(false);
    }
  }, [applyProjectData, projectId, toast]);

  useQuicklistPolling({
    projectId,
    level: autoRefreshLevel,
    etag: projectData?.etag ?? null,
    applyData: applyProjectData,
    getMutationEpoch: () => mutationEpochRef.current,
    hasPendingMutation: () =>
      pendingMutationsRef.current > 0 || manualRefreshRef.current,
  });

  const tasks = projectData?.tasks ?? [];
  const listTitle = projectData?.project.title ?? "";

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const originalTask = tasks.find((task) => task.id === taskId);
    if (!originalTask) return;

    const finishMutation = beginMutation();
    const now = new Date().toISOString();
    const optimisticUpdates = {
      completed_at: completed ? now : null,
      updated_at: now,
    };

    if (completed) {
      setMovingDownIds((current) => new Set(current).add(taskId));
      setTimeout(() => {
        setMovingDownIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }, 600);
    }

    setResolvedTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, ...optimisticUpdates } : task
      )
    );
    updateProjectInCache(projectId, { updated_at: now });

    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);

      const result = (await res.json()) as { task?: Partial<Task> };
      if (result.task) {
        setResolvedTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, ...result.task } : task
          )
        );
        if (result.task.updated_at) {
          updateProjectInCache(projectId, {
            updated_at: result.task.updated_at,
          });
        }
      }
    } catch (mutationError) {
      setResolvedTasks((current) =>
        current.map((task) => (task.id === taskId ? originalTask : task))
      );
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Unknown error occurred",
      });
      finishMutation();
      await refreshData();
    } finally {
      finishMutation();
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<boolean> => {
    if (typeof window !== "undefined" && !window.confirm("Delete this item?")) {
      return false;
    }

    const finishMutation = beginMutation();
    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);

      setResolvedTasks((current) =>
        current.filter((task) => task.id !== taskId)
      );
      refreshQuicklists();
      return true;
    } catch (mutationError) {
      toast({
        variant: "destructive",
        title: "Failed to delete task",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Unknown error occurred",
      });
      finishMutation();
      await refreshData();
      return false;
    } finally {
      finishMutation();
    }
  };

  const handleCreateTask = async (
    pid: string,
    title: string,
    nextPosition: number
  ): Promise<Task> => {
    const finishMutation = beginMutation();
    try {
      const res = await fetch(`/api/quicklists/${pid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title, position: nextPosition }),
      });
      if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);

      const data = (await res.json()) as { ok: boolean; task: Task };
      updateProjectInCache(projectId, { updated_at: data.task.updated_at });
      return data.task;
    } finally {
      finishMutation();
    }
  };

  const handleBulkCreateTasks = async (
    titles: string[],
    afterId: string | null
  ): Promise<Task[]> => {
    const finishMutation = beginMutation();
    try {
      const res = await fetch(
        `/api/quicklists/${projectId}/tasks/bulk-create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ titles, afterId }),
        }
      );
      if (!res.ok) throw new Error(`Bulk create failed: ${res.status}`);

      const data = (await res.json()) as { ok: boolean; created: Task[] };
      const updatedAt = data.created.at(-1)?.updated_at;
      if (updatedAt) updateProjectInCache(projectId, { updated_at: updatedAt });
      return data.created;
    } finally {
      finishMutation();
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const finishMutation = beginMutation();
    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);

      const result = (await res.json()) as { task?: Partial<Task> };
      if (result.task) {
        setResolvedTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, ...result.task } : task
          )
        );
      }
    } finally {
      finishMutation();
    }
  };

  const handleUpdateProject = async (
    updates: Partial<ProjectData["project"]>
  ) => {
    const finishMutation = beginMutation();
    try {
      const res = await fetch(`/api/quicklists/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`Failed to update project: ${res.status}`);

      const data = (await res.json()) as {
        project?: Partial<ProjectData["project"]>;
      };
      if (data.project) {
        updateProjectData((current) => ({
          ...current,
          etag: null,
          project: { ...current.project, ...data.project },
        }));
        updateProjectInCache(projectId, data.project);
      }
    } finally {
      finishMutation();
    }
  };

  const handleReorderTasks = async (taskIds: string[]) => {
    const finishMutation = beginMutation();
    try {
      const res = await fetch(`/api/quicklists/${projectId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ taskIds }),
      });
      if (!res.ok) throw new Error(`Failed to reorder: ${res.status}`);

      const data = (await res.json()) as { tasks?: Task[] };
      if (data.tasks) {
        setResolvedTasks((current) => {
          const completed = current.filter((task) => !!task.completed_at);
          return [...data.tasks!, ...completed];
        });
      }
      updateProjectInCache(projectId, { updated_at: new Date().toISOString() });
    } catch (mutationError) {
      toast({
        variant: "destructive",
        title: "Failed to reorder list",
        description:
          mutationError instanceof Error ? mutationError.message : "Unknown",
      });
      finishMutation();
      await refreshData();
    } finally {
      finishMutation();
    }
  };

  const hasCompleted = tasks.some((task) => !!task.completed_at);

  const handleDropCompleted = async () => {
    if (!hasCompleted) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Drop all completed tasks?")
    ) {
      return;
    }

    const finishMutation = beginMutation();
    const previousTasks = tasks;
    setResolvedTasks(previousTasks.filter((task) => !task.completed_at));

    try {
      const res = await fetch(`/api/quicklists/${projectId}/drop-completed`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Failed to drop completed: ${res.status}`);

      const data = (await res.json()) as { ok: boolean; tasks?: Task[] };
      if (data.tasks) setResolvedTasks(data.tasks);
      updateProjectInCache(projectId, { updated_at: new Date().toISOString() });
    } catch (mutationError) {
      setResolvedTasks(previousTasks);
      toast({
        variant: "destructive",
        title: "Failed to drop completed",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Unknown error",
      });
      finishMutation();
      await refreshData();
    } finally {
      finishMutation();
    }
  };

  return {
    projectData,
    isLoading,
    isRefreshing: manualRefreshing || pendingMutationCount > 0,
    error,
    refetch: refreshData,
    tasks,
    setTasks: setResolvedTasks,
    listTitle,
    setListTitle: setResolvedListTitle,
    movingDownIds,
    setMovingDownIds,
    handleToggleTask,
    handleDeleteTask,
    handleCreateTask,
    handleBulkCreateTasks,
    handleUpdateTask,
    handleReorderTasks,
    handleUpdateProject,
    refreshData,
    hasCompleted,
    handleDropCompleted,
  };
};
