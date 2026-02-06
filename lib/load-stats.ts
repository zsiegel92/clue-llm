import type { PredictedTestCases } from "./schemas";

export type AggregateStats = {
  totalPredictions: number;
  overallAccuracy: number;
  avgConfidenceWhenCorrect: number;
  avgConfidenceWhenIncorrect: number;
  avgNumSuspects: number;
  randomChanceAccuracy: number;
  model: string;
};

/**
 * Calculates aggregate statistics from the clue predictions dataset.
 * Uses dynamic import to avoid loading the large JSON file at build time.
 */
export async function calculateAggregateStats(): Promise<AggregateStats> {
  const data = (await import("./clue-predictions.json")) as {
    default: PredictedTestCases;
  };
  const predictions = data.default;

  if (predictions.length === 0) {
    throw new Error("No predictions available");
  }

  let correctCount = 0;
  let totalConfidenceCorrect = 0;
  let totalConfidenceIncorrect = 0;
  let correctWithConfidenceCount = 0;
  let incorrectWithConfidenceCount = 0;
  let totalSuspects = 0;

  for (const testCase of predictions) {
    const { correctness, confidence } = testCase.predictionData;
    const numSuspects = testCase.game.names.length;

    totalSuspects += numSuspects;

    if (correctness) {
      correctCount++;
      if (confidence !== undefined) {
        totalConfidenceCorrect += confidence;
        correctWithConfidenceCount++;
      }
    } else {
      if (confidence !== undefined) {
        totalConfidenceIncorrect += confidence;
        incorrectWithConfidenceCount++;
      }
    }
  }

  const model = predictions[0]?.predictionData.metadata.model ?? "unknown";
  const avgNumSuspects = totalSuspects / predictions.length;
  const randomChanceAccuracy = 1 / avgNumSuspects;

  return {
    totalPredictions: predictions.length,
    overallAccuracy: correctCount / predictions.length,
    avgConfidenceWhenCorrect:
      correctWithConfidenceCount > 0
        ? totalConfidenceCorrect / correctWithConfidenceCount
        : 0,
    avgConfidenceWhenIncorrect:
      incorrectWithConfidenceCount > 0
        ? totalConfidenceIncorrect / incorrectWithConfidenceCount
        : 0,
    avgNumSuspects,
    randomChanceAccuracy,
    model,
  };
}
