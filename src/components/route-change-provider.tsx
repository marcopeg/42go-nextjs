'use client';

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Route change events and state
interface RouteChangeContextType {
  isChangingRoute: boolean;
  lastPathname: string | null;
  registerRouteChangeStart: () => void;
  registerRouteChangeComplete: () => void;
}

const RouteChangeContext = createContext<RouteChangeContextType>({
  isChangingRoute: false,
  lastPathname: null,
  registerRouteChangeStart: () => {},
  registerRouteChangeComplete: () => {},
});

/**
 * Hook to access route change state
 * Will return dummy values if used outside the provider
 */
export const useRouteChange = (): RouteChangeContextType => {
  const context = useContext(RouteChangeContext);

  // Safe guard for when the hook is used outside of the provider
  if (!('isChangingRoute' in context)) {
    console.warn('useRouteChange must be used within a RouteChangeProvider');
    return {
      isChangingRoute: false,
      lastPathname: null,
      registerRouteChangeStart: () => {},
      registerRouteChangeComplete: () => {},
    };
  }

  return context;
};

interface RouteChangeProviderProps {
  children: ReactNode;
}

/**
 * Provider component that tracks Next.js route changes to optimize resource loading
 * This helps prevent redundant API calls during route transitions
 */
export function RouteChangeProvider({ children }: RouteChangeProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingRoute, setIsChangingRoute] = useState(false);
  const [lastPathname, setLastPathname] = useState<string | null>(null);

  // Register the start of a route change
  const registerRouteChangeStart = useCallback(() => {
    setIsChangingRoute(true);
  }, []);

  // Register the completion of a route change
  const registerRouteChangeComplete = useCallback(() => {
    // Small delay to ensure components have time to mount
    setTimeout(() => {
      setIsChangingRoute(false);
    }, 100);
  }, []);

  // Extract search params as a string to avoid dependency array issues
  const searchParamsString = searchParams.toString();

  // Detect route changes based on pathname and search params
  useEffect(() => {
    // Don't trigger on initial render
    if (lastPathname !== null) {
      registerRouteChangeStart();
      // Route change is complete
      registerRouteChangeComplete();
    }

    setLastPathname(pathname);
  }, [
    pathname,
    searchParamsString,
    registerRouteChangeStart,
    registerRouteChangeComplete,
    lastPathname,
  ]);

  const contextValue = {
    isChangingRoute,
    lastPathname,
    registerRouteChangeStart,
    registerRouteChangeComplete,
  };

  return <RouteChangeContext.Provider value={contextValue}>{children}</RouteChangeContext.Provider>;
}
