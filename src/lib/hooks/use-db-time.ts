'use client';

import { useState, useEffect } from 'react';

export function useDbTime() {
  const [dbTime, setDbTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch in development or test environments
  const shouldFetch = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (!shouldFetch) return;

    const fetchDbTime = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/db-time');

        if (!response.ok) {
          throw new Error('Failed to fetch database time');
        }

        const data = await response.json();
        setDbTime(new Date(data.time).toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching database time:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDbTime();

    // Refresh every minute
    const intervalId = setInterval(fetchDbTime, 60000);

    return () => clearInterval(intervalId);
  }, [shouldFetch]);

  return { dbTime, loading, error, isEnabled: shouldFetch };
}
