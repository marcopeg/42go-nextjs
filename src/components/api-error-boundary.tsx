'use client';

import { ReactNode, createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AccessDenied } from '@/components/access-denied';

interface ApiErrorContextType {
  setAccessDenied: (value: boolean, message?: string) => void;
  isAccessDenied: boolean;
  accessDeniedMessage: string;
}

const ApiErrorContext = createContext<ApiErrorContextType | undefined>(undefined);

export function useApiError() {
  const context = useContext(ApiErrorContext);
  if (!context) {
    throw new Error('useApiError must be used within an ApiErrorBoundary');
  }
  return context;
}

interface ApiErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  /**
   * When true, the access denied component will be rendered with full-page styling,
   * taking up the entire content area including where the title would be.
   * Use for high-level page components.
   */
  fullPage?: boolean;
}

export function ApiErrorBoundary({
  children,
  fallbackTitle = 'Access Denied',
  fallbackMessage = 'You do not have permission to access this resource.',
  fullPage = false,
}: ApiErrorBoundaryProps) {
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(fallbackMessage);

  // Use useCallback to ensure the function reference remains stable
  const setAccessDeniedWithMessage = useCallback(
    (value: boolean, message?: string) => {
      setIsAccessDenied(value);
      if (message) {
        setAccessDeniedMessage(message);
      } else {
        setAccessDeniedMessage(fallbackMessage);
      }
    },
    [fallbackMessage]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      setAccessDenied: setAccessDeniedWithMessage,
      isAccessDenied,
      accessDeniedMessage,
    }),
    [setAccessDeniedWithMessage, isAccessDenied, accessDeniedMessage]
  );

  if (isAccessDenied) {
    return <AccessDenied title={fallbackTitle} message={accessDeniedMessage} fullPage={fullPage} />;
  }

  return <ApiErrorContext.Provider value={value}>{children}</ApiErrorContext.Provider>;
}
