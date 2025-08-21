import { Skeleton } from "@/components/ui/skeleton";

export function ProjectListSkeleton() {
  return (
    <div className="overflow-hidden md:border md:rounded-md md:mx-6 md:mt-6 md:mb-6">
      <ul className="divide-y">
        {/* Generate 3-5 skeleton items */}
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32 md:w-48" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectDetailsSkeleton() {
  return (
    <div className="max-w-3xl w-full pt-2 pb-24 md:pb-0 px-0">
      <div className="overflow-hidden md:border md:rounded-md md:mx-6 md:mt-6 md:mb-6">
        <ul className="divide-y">
          {/* Generate 5-7 skeleton task items */}
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full max-w-xs" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProjectListErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-sm text-red-600 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-950/20 max-w-md mx-auto">
        <p className="font-medium mb-2">Failed to load projects</p>
        <p className="text-xs mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export function ProjectDetailsErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-sm text-red-600 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-950/20 max-w-md mx-auto">
        <p className="font-medium mb-2">Failed to load project</p>
        <p className="text-xs mb-3">{error}</p>
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
