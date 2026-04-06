export function SkeletonBlocks({ count = 3, className = "h-28" }: { count?: number; className?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`app-card animate-pulse ${className}`} />
      ))}
    </div>
  );
}

