'use client';

import { useDbTime } from '@/lib/hooks/use-db-time';
import { cn } from '@/lib/utils';

export function DbTimeDisplay({ className }: { className?: string }) {
  const { dbTime, loading, error, isEnabled } = useDbTime();

  // Don't render anything in production
  if (!isEnabled) return null;

  return (
    <div className={cn('text-xs text-muted-foreground/50', className)}>
      {loading && !dbTime ? (
        <span>Loading DB time...</span>
      ) : error ? (
        <span className="text-destructive/50">DB Error: {error}</span>
      ) : dbTime ? (
        <span>DB Time: {new Date(dbTime).toLocaleString()}</span>
      ) : null}
    </div>
  );
}
