"use client";

import { useEffect } from "react";

import { useAppConfig } from "@/42go/config/use-app-config";
import { configureEventTracker, flushEvents, trackEvent } from "@/42go/events/client";

export const useEventTracker = () => {
  const config = useAppConfig();

  useEffect(() => {
    configureEventTracker(config?.app?.events);
  }, [config?.app?.events]);

  return {
    trackEvent,
    flushEvents,
  };
};
