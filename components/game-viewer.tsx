import { Suspense } from "react";
import { loadRandomExample } from "@/lib/load-example";
import { GameViewerClient } from "./game-viewer-client";

/**
 * Server component that loads initial random example and wraps client component.
 */
export async function GameViewer() {
  const initialData = await loadRandomExample();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100" />
        </div>
      }
    >
      <GameViewerClient initialData={initialData} />
    </Suspense>
  );
}
