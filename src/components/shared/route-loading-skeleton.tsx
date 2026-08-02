import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoadingSkeleton({
  cardCount = 6,
  showTable = false,
}: {
  cardCount?: number;
  showTable?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {showTable && <Skeleton className="h-96 rounded-xl" />}
    </div>
  );
}
