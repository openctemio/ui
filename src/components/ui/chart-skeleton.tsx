import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  height?: number;
  type?: "area" | "bar" | "pie" | "line";
}

export function ChartSkeleton({ height = 300, type = "area" }: ChartSkeletonProps) {
  if (type === "pie") {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
    );
  }

  if (type === "bar") {
    // Fixed heights for skeleton bars to avoid impure Math.random during render
    const barHeights = [65, 45, 80, 55, 70, 40];
    return (
      <div className="flex items-end justify-around gap-2 px-4" style={{ height }}>
        {barHeights.map((h, i) => (
          <Skeleton
            key={i}
            className="w-12"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    );
  }

  // Default area/line chart skeleton
  return (
    <div className="space-y-3 p-4" style={{ height }}>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-[85%] w-full" />
      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}
