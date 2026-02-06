import data from "./clue-test-cases.json";
import fewShotData from "./few-shot-example-clue-test-cases.json";
import { type ClueTestCases, clueTestCasesSchema } from "./schemas";

export const clueTestCases = clueTestCasesSchema.parse(
  data,
) satisfies ClueTestCases;

export const fewShotExamples = clueTestCasesSchema.parse(
  fewShotData,
) satisfies ClueTestCases;

export type {
  SerializedGame,
  SerializedPersonActivity,
  SerializedProposition,
} from "./schemas";
