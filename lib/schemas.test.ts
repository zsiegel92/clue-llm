import { describe, expect, it } from "vitest";
import {
  baseOpenAIModelSchema,
  fineTunedModelSlugs,
  modelComparisonPredictionsSchema,
  openAIModelThatGivesLogProbsSchema,
  predictedTestCaseSchema,
  serializedGameSchema,
} from "./schemas";

describe("fineTunedModelSlugs", () => {
  it("has all four fine-tuning job suffixes", () => {
    expect(Object.keys(fineTunedModelSlugs)).toEqual([
      "most-conf-wrong",
      "least-conf-wrong",
      "correct",
      "all-cases",
    ]);
  });

  it("all slugs start with ft:", () => {
    for (const slug of Object.values(fineTunedModelSlugs)) {
      expect(slug).toMatch(/^ft:/);
    }
  });

  it("all fine-tuned slugs are valid in openAIModelThatGivesLogProbsSchema", () => {
    for (const slug of Object.values(fineTunedModelSlugs)) {
      const result = openAIModelThatGivesLogProbsSchema.safeParse(slug);
      expect(result.success).toBe(true);
    }
  });
});

describe("openAIModelThatGivesLogProbsSchema", () => {
  it("accepts base models", () => {
    for (const model of [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
    ]) {
      const result = openAIModelThatGivesLogProbsSchema.safeParse(model);
      expect(result.success).toBe(true);
    }
  });

  it("accepts fine-tuned models", () => {
    for (const slug of Object.values(fineTunedModelSlugs)) {
      const result = openAIModelThatGivesLogProbsSchema.safeParse(slug);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid model names", () => {
    const result =
      openAIModelThatGivesLogProbsSchema.safeParse("invalid-model");
    expect(result.success).toBe(false);
  });
});

describe("baseOpenAIModelSchema", () => {
  it("accepts only base models, not fine-tuned", () => {
    expect(baseOpenAIModelSchema.safeParse("gpt-4.1").success).toBe(true);
    expect(
      baseOpenAIModelSchema.safeParse(fineTunedModelSlugs["all-cases"]).success,
    ).toBe(false);
  });
});

describe("modelComparisonPredictionsSchema", () => {
  it("validates an empty record", () => {
    const result = modelComparisonPredictionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates a populated record with one model", () => {
    const sampleGame = serializedGameSchema.parse({
      seed: 1,
      killer: "Alice",
      names: ["Alice", "Bob"],
      technologies: ["Python", "Java"],
      places: ["Paris", "London"],
      companies: ["Acme", "Corp"],
      institutions: ["MIT", "Harvard"],
      foods: ["Pizza", "Sushi"],
      materials: ["Wood", "Steel"],
      ground_truth: {
        Alice: {
          technology: "Python",
          place: "Paris",
          company: "Acme",
          institution: "MIT",
          food: "Pizza",
          material: "Wood",
        },
        Bob: {
          technology: "Java",
          place: "London",
          company: "Corp",
          institution: "Harvard",
          food: "Sushi",
          material: "Steel",
        },
      },
      propositions: [
        {
          prop_type: "direct_elimination",
          person: "Bob",
          person1: null,
          person2: null,
          attr_category: null,
          attr1_cat: null,
          attr2_cat: null,
          value: null,
          val1: null,
          val2: null,
          mat1: null,
          food2: null,
          inst2: null,
        },
      ],
    });

    const samplePrediction = predictedTestCaseSchema.parse({
      game: sampleGame,
      predictionData: {
        prediction: "Alice",
        correctness: true,
        confidence: 0.95,
        metadata: { model: "gpt-4.1-nano" },
      },
    });

    const result = modelComparisonPredictionsSchema.safeParse({
      "gpt-4.1-nano": [samplePrediction],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid values", () => {
    const result = modelComparisonPredictionsSchema.safeParse({
      "gpt-4.1": "not-an-array",
    });
    expect(result.success).toBe(false);
  });
});
