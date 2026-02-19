import { z } from "zod";

// Single token strings schema
export const singleTokenStringsSchema = z.object({
  technologies: z.array(z.string()),
  places: z.array(z.string()),
  companies: z.array(z.string()),
  institutions: z.array(z.string()),
  foods: z.array(z.string()),
  materials: z.array(z.string()),
  names: z.array(z.string()),
  lastNames: z.array(z.string()),
});

// Proposition types
export const propositionTypeSchema = z.enum([
  "person_and_attribute",
  "person_or_person",
  "person_attribute_implies_not_killer",
  "complex_or",
  "direct_elimination",
]);

// Serialized proposition schema
export const serializedPropositionSchema = z.object({
  prop_type: propositionTypeSchema,
  person: z.string().nullable(),
  person1: z.string().nullable(),
  person2: z.string().nullable(),
  attr_category: z.string().nullable(),
  attr1_cat: z.string().nullable(),
  attr2_cat: z.string().nullable(),
  value: z.string().nullable(),
  val1: z.string().nullable(),
  val2: z.string().nullable(),
  mat1: z.string().nullable(),
  food2: z.string().nullable(),
  inst2: z.string().nullable(),
});

// Person activity schema
export const serializedPersonActivitySchema = z.object({
  technology: z.string(),
  place: z.string(),
  company: z.string(),
  institution: z.string(),
  food: z.string(),
  material: z.string(),
});

// Complete game schema
export const serializedGameSchema = z.object({
  seed: z.number(),
  killer: z.string(),
  names: z.array(z.string()),
  technologies: z.array(z.string()),
  places: z.array(z.string()),
  companies: z.array(z.string()),
  institutions: z.array(z.string()),
  foods: z.array(z.string()),
  materials: z.array(z.string()),
  ground_truth: z.record(z.string(), serializedPersonActivitySchema),
  propositions: z.array(serializedPropositionSchema),
});

// Test cases schema
export const clueTestCasesSchema = z.array(serializedGameSchema);

// Base OpenAI models that give log probabilities
const baseOpenAIModelValues = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.1",
] as const;

export const baseOpenAIModelSchema = z.enum(baseOpenAIModelValues);

// Fine-tuning job suffixes
const fineTuningJobSuffixes = [
  "most-conf-wrong-2",
  "least-conf-wrong-2",
  "correct-2",
  "all-cases-2",
] as const;
type FineTuningJobSuffix = (typeof fineTuningJobSuffixes)[number];

export interface FineTuningJobConfig {
  filename: string;
  suffix: FineTuningJobSuffix;
  description: string;
}

export const fineTunedModelSlugs = {
  "most-conf-wrong-2":
    "ft:gpt-4.1-nano-2025-04-14:personal:most-conf-wrong-2:DAnlh3at",
  "least-conf-wrong-2":
    "ft:gpt-4.1-nano-2025-04-14:personal:least-conf-wrong-2:DAnptsX0",
  "correct-2": "ft:gpt-4.1-nano-2025-04-14:personal:correct-2:DAnlniaW",
  "all-cases-2": "ft:gpt-4.1-nano-2025-04-14:personal:all-cases-2:DAo5YWOA",
} as const satisfies Record<FineTuningJobSuffix, string>;

// All OpenAI models that give log probabilities (base + fine-tuned)
const openAIModelThatGivesLogProbsValues = [
  ...baseOpenAIModelValues,
  fineTunedModelSlugs["most-conf-wrong-2"],
  fineTunedModelSlugs["least-conf-wrong-2"],
  fineTunedModelSlugs["correct-2"],
  fineTunedModelSlugs["all-cases-2"],
] as const;

// OpenAI model type for predictions
export const openAIModelThatGivesLogProbsSchema = z.enum(
  openAIModelThatGivesLogProbsValues,
);

// Prediction data schema (separate from game)
export const predictionDataSchema = z.object({
  prediction: z.string(),
  correctness: z.boolean(),
  confidence: z.number().optional(),
  metadata: z.object({
    model: openAIModelThatGivesLogProbsSchema,
  }),
});

// Predicted test case schema (game + prediction results, separate objects)
export const predictedTestCaseSchema = z.object({
  game: serializedGameSchema,
  predictionData: predictionDataSchema,
});

// Array of predicted test cases
export const predictedTestCasesSchema = z.array(predictedTestCaseSchema);

// Model comparison predictions: keyed by model name
export const modelComparisonPredictionsSchema = z.record(
  z.string(),
  predictedTestCasesSchema,
);

// Infer types
export type SingleTokenStrings = z.infer<typeof singleTokenStringsSchema>;
export type PropositionType = z.infer<typeof propositionTypeSchema>;
export type SerializedProposition = z.infer<typeof serializedPropositionSchema>;
export type SerializedPersonActivity = z.infer<
  typeof serializedPersonActivitySchema
>;
export type SerializedGame = z.infer<typeof serializedGameSchema>;
export type ClueTestCases = z.infer<typeof clueTestCasesSchema>;
export type BaseOpenAIModel = z.infer<typeof baseOpenAIModelSchema>;
export type OpenAIModelThatGivesLogProbs = z.infer<
  typeof openAIModelThatGivesLogProbsSchema
>;
export type PredictionData = z.infer<typeof predictionDataSchema>;
export type PredictedTestCase = z.infer<typeof predictedTestCaseSchema>;
export type PredictedTestCases = z.infer<typeof predictedTestCasesSchema>;
export type ModelComparisonPredictions = z.infer<
  typeof modelComparisonPredictionsSchema
>;
