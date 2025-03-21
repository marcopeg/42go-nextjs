'use client';

import { useSession } from 'next-auth/react';
import { useMemo, useRef } from 'react';

/**
 * Simplified session hook with stable structure to avoid hook order issues
 *
 * @returns A consistently structured session object
 */
export function useCachedSession() {
  // Get the actual session state
  const session = useSession();

  // Use a ref to maintain stable identity
  const sessionRef = useRef(session);

  // Always update the ref with latest session
  if (session !== sessionRef.current) {
    sessionRef.current = session;
  }

  // Return a consistently structured session with stable identity
  return useMemo(() => {
    return {
      ...sessionRef.current,
    };
  }, []);
}
