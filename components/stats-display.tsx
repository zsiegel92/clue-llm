import { Suspense } from "react";
import { calculateAggregateStats } from "@/lib/load-stats";
import { StatsDisplayClient } from "./stats-display-client";

/**
 * Server component that calculates aggregate statistics and wraps client component.
 */
export async function StatsDisplay() {
  const stats = await calculateAggregateStats();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100" />
        </div>
      }
    >
      <StatsDisplayClient stats={stats} />
    </Suspense>
  );
}
