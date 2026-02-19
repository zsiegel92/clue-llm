import data from "./clue-predictions.json";
import modelComparisonData from "./clue-predictions-model-comparison.json";
import {
  type ModelComparisonPredictions,
  modelComparisonPredictionsSchema,
  type PredictedTestCases,
  predictedTestCasesSchema,
} from "./schemas";

export const cluePredictions = predictedTestCasesSchema.parse(
  data,
) satisfies PredictedTestCases;

export const clueModelComparisonPredictions =
  modelComparisonPredictionsSchema.parse(
    modelComparisonData,
  ) satisfies ModelComparisonPredictions;

export type { ModelComparisonPredictions, PredictedTestCase } from "./schemas";
