"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useQuicklists, useRefreshQuicklists } from "@/hooks/useQuicklists";

export interface Project {
  id: string;
  title: string;
  owned: boolean;
  role: string;
  updated_at: string;
}

export interface Invite {
  project_id: string;
  email: string;
  title: string;
  created_at: string;
  owner_username: string;
  owner_email: string;
}

export interface ProjectsData {
  projects: Project[];
  invites: Invite[];
  nextCursor?: string;
}

export interface UseQuicklistsDataReturn {
  // Data & loading states
  data: ProjectsData | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  
  // UI state
  creating: boolean;
  busyInvite: string | null;
  
  // Operations
  handleRefresh: () => void;
  handleCreate: () => Promise<void>;
  handleJoin: (projectId: string) => Promise<void>;
  handleReject: (projectId: string, email: string) => Promise<void>;
}

export function useQuicklistsData(): UseQuicklistsDataReturn {
  const { data, isLoading, error, refetch } = useQuicklists();
  const refreshQuicklists = useRefreshQuicklists();
  const router = useRouter();
  const { toast } = useToast();
  
  const [creating, setCreating] = useState(false);
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

  const handleReject = async (projectId: string, email: string) => {
    // TODO: Implement API call to reject invite
    // For now, just show a placeholder
    alert(`Invite rejected (implement real logic) ${projectId}, ${email}`);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    creating,
    busyInvite,
    handleRefresh,
    handleCreate,
    handleJoin,
    handleReject,
  };
}