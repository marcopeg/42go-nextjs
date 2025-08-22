"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import {
  useProject,
  useRefreshProject,
  useInvalidateProjectCache,
  useUpdateProjectInCache,
  ProjectData,
} from "@/hooks/useQuicklists";

export type Task = ProjectData["tasks"][0];

export interface UseQuicklistDataProps {
  projectId: string;
}

export interface UseQuicklistDataReturn {
  // Data & loading states
  projectData: ProjectData | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  
  // Task state
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  
  // Project title state
  listTitle: string;
  setListTitle: React.Dispatch<React.SetStateAction<string>>;
  
  // UI state
  movingDownIds: Set<string>;
  setMovingDownIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Task operations
  handleToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<boolean>;
  handleCreateTask: (projectId: string, title: string, position: number) => Promise<Task>;
  handleUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  
  // Project operations  
  handleUpdateProject: (updates: Partial<ProjectData["project"]>) => Promise<void>;
  
  // Cache operations
  invalidateCache: () => void;
  refreshData: () => void;
}

export function useQuicklistData({ projectId }: UseQuicklistDataProps): UseQuicklistDataReturn {
  const {
    data: projectData,
    isLoading,
    error,
    refetch,
  } = useProject(projectId);
  
  const refreshProject = useRefreshProject(projectId);
  const invalidateProjectCache = useInvalidateProjectCache();
  const updateProjectInCache = useUpdateProjectInCache();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>(projectData?.tasks || []);
  const [listTitle, setListTitle] = useState<string>(projectData?.project?.title || "");
  const [movingDownIds, setMovingDownIds] = useState<Set<string>>(new Set());

  // Sync tasks when projectData changes
  useEffect(() => {
    if (projectData?.tasks) {
      setTasks(projectData.tasks);
    }
  }, [projectData?.tasks]);

  // Sync list title when data changes
  useEffect(() => {
    if (projectData?.project?.title) {
      setListTitle(projectData.project.title);
    }
  }, [projectData?.project?.title]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    const now = new Date().toISOString();
    const optimisticUpdates = {
      completed_at: completed ? now : null,
      updated_at: now,
    };

    if (completed) {
      setMovingDownIds((prev) => new Set(prev).add(taskId));
      setTimeout(() => {
        setMovingDownIds((prev) => {
          const n = new Set(prev);
          n.delete(taskId);
          return n;
        });
      }, 600);
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...optimisticUpdates } : t))
    );

    updateProjectInCache(projectId, { updated_at: now });

    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`);
      }

      const result = await res.json();
      if (result?.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...result.task } : t))
        );
        updateProjectInCache(projectId, { updated_at: result.task.updated_at });
      }
    } catch (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? originalTask : t)));

      toast({
        variant: "destructive",
        title: "Failed to update task",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });

      refetch();
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<boolean> => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this item?");
      if (!ok) return false;
    }

    try {
      const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      invalidateProjectCache(projectId, { taskDeleted: true });
      return true;
    } catch {
      return false;
    }
  };

  const handleCreateTask = async (
    pid: string,
    title: string,
    nextPosition: number
  ): Promise<Task> => {
    const res = await fetch(`/api/quicklists/${pid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ title, position: nextPosition }),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to create task: ${res.status}`);
    }
    
    const data = (await res.json()) as {
      ok: boolean;
      task: Task;
    };
    return data.task;
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const res = await fetch(`/api/quicklists/${projectId}/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(updates),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to update task: ${res.status}`);
    }
    
    const result = await res.json();
    if (result?.task) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...result.task } : t))
      );
    }
  };

  const handleUpdateProject = async (updates: Partial<ProjectData["project"]>) => {
    const res = await fetch(`/api/quicklists/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(updates),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to update project: ${res.status}`);
    }
    
    const data = await res.json();
    if (data?.project) {
      if (data.project.title) {
        setListTitle(data.project.title);
      }
      invalidateProjectCache(projectId, data.project);
    }
    
    return data;
  };

  const invalidateCache = () => {
    invalidateProjectCache(projectId);
  };

  const refreshData = () => {
    refreshProject();
  };

  return {
    projectData,
    isLoading,
    error,
    refetch,
    tasks,
    setTasks,
    listTitle,
    setListTitle,
    movingDownIds,
    setMovingDownIds,
    handleToggleTask,
    handleDeleteTask,
    handleCreateTask,
    handleUpdateTask,
    handleUpdateProject,
    invalidateCache,
    refreshData,
  };
}