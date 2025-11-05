/**
 * Skeleton loading component for content placeholders
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function ViewerSkeleton() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        {/* Thread Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-6 w-48 mb-3" />
          <div className="border rounded-lg p-4 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full ml-8" />
            <Skeleton className="h-24 w-full ml-8" />
          </div>
        </div>

        {/* Ground Truth Skeleton */}
        <Skeleton className="h-8 w-full mb-4" />

        {/* Table Skeleton */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full mt-1" />
          ))}
        </div>

        {/* Insight Skeleton */}
        <Skeleton className="h-24 w-full mb-6" />

        {/* Buttons Skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
