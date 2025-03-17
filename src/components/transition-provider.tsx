'use client';

import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * TransitionProvider wraps the app with AnimatePresence to enable page transitions
 *
 * @example
 * ```tsx
 * <TransitionProvider>
 *   {children}
 * </TransitionProvider>
 * ```
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      {/* Key on pathname to trigger animation on route change */}
      <div key={pathname}>{children}</div>
    </AnimatePresence>
  );
}
