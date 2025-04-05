'use client';

import { useCachedSession } from './use-cached-session';
import { useMemo } from 'react';

/**
 * Hook to check if the current user has the required grants
 *
 * @param requiredGrants Array of grant IDs to check for
 * @returns Boolean indicating if the user has all required grants
 */
export function useUserGrants(requiredGrants?: string[]): boolean {
  const { data: session } = useCachedSession();

  return useMemo(() => {
    // If no grants are required, return true
    if (!requiredGrants || requiredGrants.length === 0) {
      return true;
    }

    // If no session or user, return false
    if (!session?.user) {
      return false;
    }

    // Get user grants from session
    const userGrants = session.user.grants || [];

    // Check if user has all required grants
    return requiredGrants.every(grant => userGrants.includes(grant));
  }, [session, requiredGrants]);
}

/**
 * Hook to get all grants for the current user
 *
 * @returns Array of grant IDs the user has
 */
export function useAllUserGrants(): string[] {
  const { data: session } = useCachedSession();

  return useMemo(() => {
    if (!session?.user) {
      return [];
    }

    return session.user.grants || [];
  }, [session]);
}
