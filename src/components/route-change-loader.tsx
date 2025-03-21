'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * RouteChangeLoader component that shows a loading indicator during route changes
 *
 * @example
 * ```tsx
 * // Add to layout.tsx
 * <RouteChangeLoader />
 * ```
 */
export function RouteChangeLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // When the route changes, show the loader briefly
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Adjust timing as needed

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return (
    <>
      {isLoading && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-accent"
          initial={{ width: '0%', opacity: 1 }}
          animate={{ width: '100%', opacity: 0 }}
          transition={{
            duration: 0.5,
            ease: 'easeInOut',
          }}
        />
      )}
    </>
  );
}
