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

// OpenAI model type for predictions
export const openAIModelThatGivesLogProbsSchema = z.enum([
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.1",
]);

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

// Infer types
export type SingleTokenStrings = z.infer<typeof singleTokenStringsSchema>;
export type PropositionType = z.infer<typeof propositionTypeSchema>;
export type SerializedProposition = z.infer<typeof serializedPropositionSchema>;
export type SerializedPersonActivity = z.infer<
  typeof serializedPersonActivitySchema
>;
export type SerializedGame = z.infer<typeof serializedGameSchema>;
export type ClueTestCases = z.infer<typeof clueTestCasesSchema>;
export type OpenAIModelThatGivesLogProbs = z.infer<
  typeof openAIModelThatGivesLogProbsSchema
>;
export type PredictionData = z.infer<typeof predictionDataSchema>;
export type PredictedTestCase = z.infer<typeof predictedTestCaseSchema>;
export type PredictedTestCases = z.infer<typeof predictedTestCasesSchema>;

const fineTuningJobSuffixes = [
  "most-conf-wrong",
  "least-conf-wrong",
  "correct",
  "all-cases",
] as const;
type FineTuningJobSuffix = (typeof fineTuningJobSuffixes)[number];

export interface FineTuningJobConfig {
  filename: string;
  suffix: FineTuningJobSuffix;
  description: string;
}
