import { describe, expect, it } from "vitest";
import {
  clueModelComparisonPredictions,
  cluePredictions,
} from "./clue-predictions";
import { fineTunedModelSlugs } from "./schemas";

describe("cluePredictions", () => {
  it("loads and parses the predictions JSON", () => {
    expect(Array.isArray(cluePredictions)).toBe(true);
    expect(cluePredictions.length).toBeGreaterThan(0);
  });

  it("each prediction has the expected structure", () => {
    for (const prediction of cluePredictions) {
      expect(prediction.game).toBeDefined();
      expect(prediction.predictionData).toBeDefined();
      expect(prediction.predictionData.prediction).toBeTypeOf("string");
      expect(prediction.predictionData.correctness).toBeTypeOf("boolean");
      expect(prediction.predictionData.metadata.model).toBeTypeOf("string");
    }
  });
});

describe("clueModelComparisonPredictions", () => {
  it("loads and parses as a record (empty by default)", () => {
    expect(typeof clueModelComparisonPredictions).toBe("object");
    expect(clueModelComparisonPredictions).not.toBeNull();
  });
});

describe("modelsToCompare consistency", () => {
  it("fineTunedModelSlugs values are all distinct", () => {
    const values = Object.values(fineTunedModelSlugs);
    expect(new Set(values).size).toBe(values.length);
  });

  it("fineTunedModelSlugs keys match expected suffixes", () => {
    const keys = Object.keys(fineTunedModelSlugs);
    expect(keys).toContain("most-conf-wrong-2");
    expect(keys).toContain("least-conf-wrong-2");
    expect(keys).toContain("correct-2");
    expect(keys).toContain("all-cases-2");
    expect(keys.length).toBe(4);
  });
});
