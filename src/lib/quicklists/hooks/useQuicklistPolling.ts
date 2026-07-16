"use client";

import { useEffect, useRef } from "react";

import {
  getQuicklistAutoRefreshIntervalMs,
  type QuicklistAutoRefreshLevel,
} from "@/config/quicklist/profile-options";
import {
  fetchProjectConditional,
  type ProjectData,
} from "@/lib/quicklists/hooks/useQuicklists";
import { shouldCoalesceQuicklistResumeSignal } from "@/lib/quicklists/polling";

const MUTATION_RETRY_MS = 500;

type UseQuicklistPollingProps = {
  projectId: string;
  level: QuicklistAutoRefreshLevel | null;
  etag: string | null;
  applyData: (data: ProjectData) => void;
  getMutationEpoch: () => number;
  hasPendingMutation: () => boolean;
};

export const useQuicklistPolling = ({
  projectId,
  level,
  etag,
  applyData,
  getMutationEpoch,
  hasPendingMutation,
}: UseQuicklistPollingProps) => {
  const latestRef = useRef({
    etag,
    applyData,
    getMutationEpoch,
    hasPendingMutation,
  });

  useEffect(() => {
    latestRef.current = {
      etag,
      applyData,
      getMutationEpoch,
      hasPendingMutation,
    };
  }, [applyData, etag, getMutationEpoch, hasPendingMutation]);

  const intervalMs = level
    ? getQuicklistAutoRefreshIntervalMs(level)
    : null;

  useEffect(() => {
    if (!projectId || intervalMs === null) return;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let inFlight = false;
    let lastResumeAt = 0;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const isHidden = () =>
      typeof document !== "undefined" && document.visibilityState === "hidden";

    const schedule = (delayMs = intervalMs) => {
      clearTimer();
      if (disposed || isHidden()) return;
      timer = setTimeout(() => {
        void runCheck();
      }, delayMs);
    };

    const runCheck = async () => {
      if (disposed || inFlight || isHidden()) return;

      if (latestRef.current.hasPendingMutation()) {
        schedule(MUTATION_RETRY_MS);
        return;
      }

      inFlight = true;
      controller = new AbortController();
      const mutationEpoch = latestRef.current.getMutationEpoch();

      try {
        const result = await fetchProjectConditional(
          projectId,
          latestRef.current.etag,
          controller.signal
        );

        if (
          result.modified &&
          mutationEpoch === latestRef.current.getMutationEpoch() &&
          !latestRef.current.hasPendingMutation()
        ) {
          latestRef.current.applyData(result.data);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Polling is best-effort. The next interval retries; manual refresh remains available.
        }
      } finally {
        inFlight = false;
        controller = null;
        schedule();
      }
    };

    const runForegroundCheck = () => {
      if (disposed || isHidden()) return;

      const now = Date.now();
      if (shouldCoalesceQuicklistResumeSignal(lastResumeAt, now)) return;
      lastResumeAt = now;
      clearTimer();

      if (!inFlight) void runCheck();
    };

    const handleVisibilityChange = () => {
      if (isHidden()) {
        clearTimer();
        return;
      }

      runForegroundCheck();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", runForegroundCheck);
    window.addEventListener("focus", runForegroundCheck);
    schedule();

    return () => {
      disposed = true;
      clearTimer();
      controller?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", runForegroundCheck);
      window.removeEventListener("focus", runForegroundCheck);
    };
  }, [intervalMs, projectId]);
};
