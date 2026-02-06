import type { PredictedTestCase, PredictedTestCases } from "./schemas";

/**
 * Loads a random example from the clue predictions dataset.
 * Uses dynamic import to avoid loading the large JSON file at build time.
 */
export async function loadRandomExample(): Promise<PredictedTestCase> {
  const data = (await import("./clue-predictions.json")) as {
    default: PredictedTestCases;
  };
  const predictions = data.default;

  if (predictions.length === 0) {
    throw new Error("No predictions available");
  }

  const randomIndex = Math.floor(Math.random() * predictions.length);
  return predictions[randomIndex];
}
