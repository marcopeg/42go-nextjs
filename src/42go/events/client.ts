"use client";

import type { TEventsConfig, TEventJson } from "@/42go/events";
import {
  EVENT_DEFAULT_BATCH_SIZE,
  EVENT_DEFAULT_FLUSH_INTERVAL_MS,
  validateEventName,
} from "@/42go/events";

type QueuedEvent = {
  name: string;
  eventAt: string;
  data: TEventJson;
  meta: TEventJson;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let configured = false;
let config: TEventsConfig | null = null;
let listenersRegistered = false;

const getBatchSize = () =>
  Math.max(1, Math.min(config?.batchSize || EVENT_DEFAULT_BATCH_SIZE, 50));

const getFlushInterval = () =>
  Math.max(1000, config?.flushIntervalMs || EVENT_DEFAULT_FLUSH_INTERVAL_MS);

const canUseEvents = () => !!config?.enabled;

const scheduleFlush = () => {
  if (flushTimer || !canUseEvents()) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, getFlushInterval());
};

const sendBatch = async (events: QueuedEvent[], keepalive = false) => {
  if (events.length === 0) return;
  const body = JSON.stringify({ events });

  if (keepalive && typeof navigator !== "undefined" && navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/events",
      new Blob([body], { type: "application/json" })
    );
    if (sent) return;
  }

  await fetch("/api/events", {
    method: "POST",
    credentials: "same-origin",
    keepalive,
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
};

export const configureEventTracker = (nextConfig?: TEventsConfig | null) => {
  config = nextConfig || null;
  configured = true;

  if (typeof window === "undefined" || listenersRegistered) return;

  listenersRegistered = true;

  window.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") {
        void flushEvents({ keepalive: true });
      }
    }
  );

  window.addEventListener(
    "pagehide",
    () => {
      void flushEvents({ keepalive: true });
    }
  );
};

export const trackEvent = (
  name: string,
  data: TEventJson = {},
  options: { meta?: TEventJson; eventAt?: Date | string } = {}
) => {
  if (!configured || !canUseEvents()) {
    console.warn(`Event logging is not available for event "${name}".`);
    return;
  }

  queue.push({
    name: validateEventName(name),
    eventAt:
      options.eventAt instanceof Date
        ? options.eventAt.toISOString()
        : options.eventAt || new Date().toISOString(),
    data,
    meta: options.meta || {},
  });

  if (queue.length >= getBatchSize()) {
    void flushEvents();
    return;
  }

  scheduleFlush();
};

export const flushEvents = async (options: { keepalive?: boolean } = {}) => {
  if (!canUseEvents() || queue.length === 0) return;

  const batch = queue.splice(0, getBatchSize());
  try {
    await sendBatch(batch, options.keepalive);
  } catch (error) {
    queue = [...batch, ...queue];
    console.warn("Event logging flush failed.", error);
  }

  if (queue.length > 0) scheduleFlush();
};
