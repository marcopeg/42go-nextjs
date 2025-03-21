'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApiError } from '@/components/api-error-boundary';

interface ApiCallOptions extends RequestInit {
  skipErrorHandling?: boolean;
  useErrorBoundary?: boolean;
  accessDeniedMessage?: string;
}

interface ApiCallState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  isAccessDenied: boolean;
}

// Hook that uses the ApiErrorBoundary
export function useApiCallWithBoundary<T>(
  url: string,
  options?: Omit<ApiCallOptions, 'useErrorBoundary'>
): ApiCallState<T> & { refetch: () => Promise<void> } {
  const apiErrorContext = useApiError();

  return useApiCallBase(url, {
    ...options,
    apiErrorContext,
    useErrorBoundary: true,
  });
}

// Main hook that doesn't require the boundary
export function useApiCall<T>(
  url: string,
  options?: ApiCallOptions
): ApiCallState<T> & { refetch: () => Promise<void> } {
  return useApiCallBase(url, options);
}

// Base implementation that both hooks use
function useApiCallBase<T>(
  url: string,
  options?: ApiCallOptions & { apiErrorContext?: ReturnType<typeof useApiError> }
): ApiCallState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    error: null,
    loading: true,
    isAccessDenied: false,
  });

  // Store options in a ref to avoid dependency changes
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Store API error context in a ref to avoid dependency changes
  const apiErrorContextRef = useRef(options?.apiErrorContext);
  apiErrorContextRef.current = options?.apiErrorContext;

  const fetchData = useCallback(async () => {
    setState(prevState => ({ ...prevState, loading: true }));

    try {
      const currentOptions = optionsRef.current;
      const response = await fetch(url, currentOptions);

      // Check if the response is an access denied error (status 401 or 403)
      if (response.status === 403 || response.status === 401) {
        // If we have an ApiErrorContext and should use it, set the error there
        const currentApiErrorContext = apiErrorContextRef.current;
        const shouldUseErrorBoundary =
          currentOptions?.useErrorBoundary && currentApiErrorContext !== undefined;

        let errorMessage = currentOptions?.accessDeniedMessage;

        // If no custom message is provided, use specific messages based on status code
        if (!errorMessage) {
          errorMessage =
            response.status === 401
              ? 'Please log in to access this resource.'
              : 'You do not have permission to access this resource.';
        }

        if (shouldUseErrorBoundary && currentApiErrorContext) {
          currentApiErrorContext.setAccessDenied(true, errorMessage);
        }

        // Update local state
        setState({
          data: null,
          error: new Error(errorMessage),
          loading: false,
          isAccessDenied: true,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      setState({
        data,
        error: null,
        loading: false,
        isAccessDenied: false,
      });
    } catch (error) {
      if (!optionsRef.current?.skipErrorHandling) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          isAccessDenied: false,
        });
      }
    }
  }, [url]); // Only depend on the URL

  useEffect(() => {
    let isMounted = true;

    const execute = async () => {
      if (isMounted) {
        await fetchData();
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}
