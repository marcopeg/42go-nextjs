'use client';

import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouteChange } from '@/components/route-change-provider';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Debug mode to help track redundant API calls
const DEBUG_SESSION_CALLS = true;

// Use a module-level variable to track if the initial fetch is in progress
// This prevents multiple components from all triggering the initial fetch
let isInitialSessionFetchInProgress = false;
let initialFetchStartTime = 0;

interface CachedSessionData {
  data: Session | null;
  timestamp: number;
}

// Create a global cache to persist between component instances
const sessionCache: { current: CachedSessionData | null } = { current: null };

// Track instances to help debug multiple calls
let instanceCounter = 0;

/**
 * Custom hook that wraps useSession with proper memoization to reduce redundant API calls
 *
 * @returns The same values as useSession but with optimized caching
 */
export function useCachedSession() {
  const instanceId = useMemo(() => ++instanceCounter, []);
  const originalSession = useSession();
  const { isChangingRoute, lastPathname } = useRouteChange();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Track if this is an initial fetch (first time this hook is called in this component)
  const isFirstRender = useRef(true);

  // Debug session calls
  useEffect(() => {
    if (DEBUG_SESSION_CALLS) {
      console.log(`[SESSION] Instance ${instanceId} received data:`, {
        status: originalSession.status,
        isChangingRoute,
        path: lastPathname,
        initialFetchInProgress: isInitialSessionFetchInProgress,
      });
    }

    // If this is the first render and an initial fetch is in progress, wait for it
    if (isFirstRender.current && isInitialSessionFetchInProgress) {
      if (DEBUG_SESSION_CALLS) {
        console.log(`[SESSION] Instance ${instanceId} waiting for initial fetch (in progress)`);
      }

      // Force a refresh once initial fetch completes or after 2 seconds max
      const timeElapsed = initialFetchStartTime ? Date.now() - initialFetchStartTime : 0;
      const timeoutDuration = Math.max(50, Math.min(2000 - timeElapsed, 2000));

      const timeoutId = setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, timeoutDuration);

      return () => clearTimeout(timeoutId);
    }

    // No longer first render
    isFirstRender.current = false;
  }, [originalSession, isChangingRoute, lastPathname, instanceId]);

  // Update cache when we get new session data
  useEffect(() => {
    if (originalSession.data && originalSession.status === 'authenticated') {
      // If this was the initial fetch, mark it as complete
      if (isInitialSessionFetchInProgress) {
        isInitialSessionFetchInProgress = false;
        if (DEBUG_SESSION_CALLS) {
          console.log(
            `[SESSION] Initial fetch completed after ${Date.now() - (initialFetchStartTime || 0)}ms`
          );
        }
      }

      sessionCache.current = {
        data: originalSession.data,
        timestamp: Date.now(),
      };

      if (DEBUG_SESSION_CALLS) {
        console.log(`[SESSION] Updated cache at ${new Date().toISOString()}`);
      }
    }
  }, [originalSession.data, originalSession.status]);

  // Handle route changes to improve caching during transitions
  useEffect(() => {
    // If we detect a route change, refresh the session data after navigation completes
    if (!isChangingRoute && lastPathname) {
      // Short delay to ensure route change has fully completed
      const timeoutId = setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [isChangingRoute, lastPathname]);

  // Create a refreshed session object that includes forceUpdate in its dependencies
  // This ensures it's recreated when forceUpdate changes (without needing to use the value)

  const refreshSession = useCallback(() => {
    // Mark that we're doing an initial fetch if this is the first time
    if (
      !isInitialSessionFetchInProgress &&
      !sessionCache.current &&
      originalSession.status === 'loading'
    ) {
      isInitialSessionFetchInProgress = true;
      initialFetchStartTime = Date.now();
      if (DEBUG_SESSION_CALLS) {
        console.log(`[SESSION] Starting initial fetch at ${new Date().toISOString()}`);
      }
    }

    // During route changes or initial load, always use cached data if available
    if ((isChangingRoute || isInitialSessionFetchInProgress) && sessionCache.current) {
      if (DEBUG_SESSION_CALLS) {
        console.log(
          `[SESSION] Using cached data during ${isChangingRoute ? 'route change' : 'initial load'}`
        );
      }
      return {
        ...originalSession,
        data: sessionCache.current.data,
        status: sessionCache.current.data
          ? ('authenticated' as const)
          : ('unauthenticated' as const),
      };
    }

    // Check if cache is valid and not expired
    if (!sessionCache.current || Date.now() - sessionCache.current.timestamp > CACHE_DURATION) {
      if (DEBUG_SESSION_CALLS && !sessionCache.current) {
        console.log(`[SESSION] No cache available, using original session`);
      } else if (DEBUG_SESSION_CALLS) {
        console.log(`[SESSION] Cache expired, using original session`);
      }
      return originalSession;
    }

    // Return cached data
    if (DEBUG_SESSION_CALLS) {
      console.log(
        `[SESSION] Using cached data, age: ${(Date.now() - sessionCache.current.timestamp) / 1000}s`
      );
    }
    return {
      ...originalSession,
      data: sessionCache.current.data,
      status: sessionCache.current.data ? ('authenticated' as const) : ('unauthenticated' as const),
    };
  }, [originalSession, isChangingRoute, forceUpdate]);

  // Use memoization to prevent redundant calculations
  return useMemo(() => refreshSession(), [refreshSession]);
}
