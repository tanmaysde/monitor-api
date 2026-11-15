import { CardSkeleton, TableSkeleton, TextSkeleton } from "./Skeleton";

/** Placeholder for a detail page while its record is still loading. */
export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label={label}>
      <TextSkeleton lines={2} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
}
