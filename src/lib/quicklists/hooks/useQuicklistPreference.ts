"use client";

import { useQuery } from "@tanstack/react-query";

import {
  QUICKLIST_AUTO_REFRESH_PROFILE_KEY,
  type QuicklistAutoRefreshLevel,
  resolveQuicklistAutoRefreshLevel,
} from "@/config/quicklist/profile-options";

type ProfileResponse = {
  profile?: Record<string, unknown> | null;
};

const QUICKLIST_PROFILE_QUERY_KEY = ["quicklist", "profile-preferences"];

const fetchQuicklistProfile = async (): Promise<ProfileResponse> => {
  const res = await fetch("/api/profile", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load refresh preference: ${res.status}`);
  }

  return res.json() as Promise<ProfileResponse>;
};

export const useQuicklistPreference = (): {
  level: QuicklistAutoRefreshLevel | null;
  isLoading: boolean;
  error: unknown;
} => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUICKLIST_PROFILE_QUERY_KEY,
    queryFn: fetchQuicklistProfile,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  return {
    level:
      data && !error
        ? resolveQuicklistAutoRefreshLevel(
            data.profile?.[QUICKLIST_AUTO_REFRESH_PROFILE_KEY]
          )
        : null,
    isLoading,
    error,
  };
};
