"use client";

import { useEffect, useRef, useState } from "react";

export const LINGOCAFE_ROUTE_LOADING_DELAY_MS = 400;
export const LINGOCAFE_ROUTE_LOADING_MIN_VISIBLE_MS = 800;

type UseLingocafeRouteLoadingOptions = {
  isLoading: boolean;
  canDelay: boolean;
  showDelayMs?: number;
  minVisibleMs?: number;
};

const clearTimer = (timerRef: { current: ReturnType<typeof setTimeout> | null }) => {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
};

export const useLingocafeRouteLoading = ({
  isLoading,
  canDelay,
  showDelayMs = LINGOCAFE_ROUTE_LOADING_DELAY_MS,
  minVisibleMs = LINGOCAFE_ROUTE_LOADING_MIN_VISIBLE_MS,
}: UseLingocafeRouteLoadingOptions) => {
  const [showLoading, setShowLoading] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
    };
  }, []);

  useEffect(() => {
    if (!canDelay) {
      clearTimer(showTimerRef);
      if (showLoading) {
        clearTimer(hideTimerRef);
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          visibleSinceRef.current = null;
          setShowLoading(false);
        }, 0);
      }
      return;
    }

    if (isLoading) {
      clearTimer(hideTimerRef);

      if (showLoading || showTimerRef.current) {
        return;
      }

      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        visibleSinceRef.current = Date.now();
        setShowLoading(true);
      }, showDelayMs);
      return;
    }

    clearTimer(showTimerRef);

    if (!showLoading) {
      visibleSinceRef.current = null;
      return;
    }

    const elapsed = visibleSinceRef.current
      ? Date.now() - visibleSinceRef.current
      : minVisibleMs;
    const remaining = Math.max(0, minVisibleMs - elapsed);

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      visibleSinceRef.current = null;
      setShowLoading(false);
    }, remaining);
  }, [canDelay, isLoading, minVisibleMs, showDelayMs, showLoading]);

  return canDelay ? showLoading : isLoading;
};
