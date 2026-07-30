'use client';

export function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />;
}

export function SkeletonKPI() {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonCard className="h-3 w-24" />
          <SkeletonCard className="h-7 w-16" />
        </div>
        <SkeletonCard className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonListRow({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-lg">
          <SkeletonCard className="h-10 w-10 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <SkeletonCard className="h-3.5 w-3/5" />
            <SkeletonCard className="h-3 w-2/5" />
          </div>
          <SkeletonCard className="h-6 w-16 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2 border-b border-slate-200 dark:border-slate-700">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonCard key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2 border-b border-slate-50 dark:border-slate-800">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonCard key={j} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
