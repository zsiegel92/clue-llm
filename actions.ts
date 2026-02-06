"use server";

import { loadRandomExample } from "./lib/load-example";
import type { PredictedTestCase } from "./lib/schemas";

/**
 * Server action to fetch a random example from the clue predictions dataset.
 * Called from client components to load new games.
 */
export async function getRandomExample(): Promise<PredictedTestCase> {
  return await loadRandomExample();
}
