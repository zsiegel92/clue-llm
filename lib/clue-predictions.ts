import data from "./clue-predictions.json";
import { type PredictedTestCases, predictedTestCasesSchema } from "./schemas";

export const cluePredictions = predictedTestCasesSchema.parse(
  data,
) satisfies PredictedTestCases;

export type { PredictedTestCase } from "./schemas";
