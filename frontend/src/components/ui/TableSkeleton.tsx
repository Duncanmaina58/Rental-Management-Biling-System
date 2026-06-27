export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-3.5 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 bg-surface-sunken rounded flex-1" style={{ maxWidth: c === 0 ? "180px" : "120px" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
