"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  readConversationBrowseCache,
  writeConversationBrowseCache,
} from "@/app/(app)/(lingocafe)/conversations/_components/conversation-browse-cache";
import { getResponseMessage } from "@/app/(app)/(lingocafe)/conversations/_components/types";

export const useConversationBrowseData = <T>({
  apiHref,
  cacheScope,
  revision,
  fallbackError,
  onData,
}: {
  apiHref: string;
  cacheScope: string | null;
  revision: number;
  fallbackError: string;
  onData?: (data: T) => void;
}) => {
  const identity = `${cacheScope ?? "anonymous"}:${revision}:${apiHref}`;
  const [result, setResult] = useState<{ identity: string; payload: T } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRevision = useRef(revision);
  const currentIdentity = useRef(identity);
  const requestGeneration = useRef(0);

  useLayoutEffect(() => {
    currentIdentity.current = identity;
    requestGeneration.current += 1;
  }, [identity]);

  const load = useCallback(async (signal?: AbortSignal, ignoreCache = false) => {
    if (!cacheScope) return;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    const isCurrent = () =>
      requestGeneration.current === generation &&
      currentIdentity.current === identity &&
      !signal?.aborted;

    const revisionChanged = lastRevision.current !== revision;
    lastRevision.current = revision;
    const cached = ignoreCache || revisionChanged
      ? null
      : readConversationBrowseCache<T>(cacheScope, apiHref);
    if (cached) {
      if (!isCurrent()) return;
      setResult({ identity, payload: cached.payload });
      onData?.(cached.payload);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const headers = new Headers();
      if (cached?.etag) headers.set("If-None-Match", cached.etag);
      const response = await fetch(apiHref, {
        credentials: "same-origin",
        cache: "no-cache",
        headers,
        signal,
      });

      if (!isCurrent()) return;
      if (response.status === 304 && cached) return;
      if (!response.ok) {
        throw new Error(await getResponseMessage(response, fallbackError));
      }

      const payload = (await response.json()) as T;
      if (!isCurrent()) return;
      setResult({ identity, payload });
      onData?.(payload);
      writeConversationBrowseCache({
        userId: cacheScope,
        href: apiHref,
        etag: response.headers.get("etag"),
        payload,
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      if (!cached && isCurrent()) {
        setError(caught instanceof Error ? caught.message : fallbackError);
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [apiHref, cacheScope, fallbackError, identity, onData, revision]);

  useEffect(() => {
    if (!cacheScope) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [cacheScope, load, revision]);

  return {
    data: result?.identity === identity ? result.payload : null,
    error,
    loading,
    reload: () => load(undefined, true),
    setData: (update: T | null | ((current: T | null) => T | null)) => {
      setResult((current) => {
        const currentPayload = current?.identity === identity ? current.payload : null;
        const payload = typeof update === "function"
          ? (update as (current: T | null) => T | null)(currentPayload)
          : update;
        return payload === null ? null : { identity, payload };
      });
    },
    setError,
  };
};
