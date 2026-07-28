"use client";

import { useEffect, useRef } from "react";

export const QUALIFIED_DISPLAY_MS = 10_000;
export const MIN_INTERSECTION_RATIO = 0.5;

export const useQualifiedDisplay = (
  communicationId: string | undefined,
  onQualified: (visitId: string) => void
) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onQualified);
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    callbackRef.current = onQualified;
  }, [onQualified]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !communicationId) return;
    const visitId = crypto.randomUUID();
    let timer: number | null = null;
    let visibleEnough = false;

    const cancel = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const start = () => {
      cancel();
      if (!visibleEnough || document.visibilityState !== "visible") return;
      timer = window.setTimeout(() => {
        if (sentRef.current === communicationId) return;
        sentRef.current = communicationId;
        callbackRef.current(visitId);
      }, QUALIFIED_DISPLAY_MS);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleEnough = entry.intersectionRatio >= MIN_INTERSECTION_RATIO;
        if (visibleEnough) start();
        else cancel();
      },
      { threshold: [0, 0.5, 1] }
    );
    const visibility = () => {
      if (document.visibilityState === "visible") start();
      else cancel();
    };
    observer.observe(element);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [communicationId]);

  return elementRef;
};
