import { describe, expect, it } from "vitest";
import { clueTestCases } from "./clue-test-cases";

describe("clue-test-cases", () => {
  it("loads 500 test cases", () => {
    expect(clueTestCases.length).toBe(500);
  });

  it("all test cases have required fields", () => {
    for (const testCase of clueTestCases) {
      expect(testCase.seed).toBeTypeOf("number");
      expect(testCase.killer).toBeTypeOf("string");
      expect(testCase.names).toBeInstanceOf(Array);
      expect(testCase.names.length).toBeGreaterThan(0);
      expect(testCase.propositions).toBeInstanceOf(Array);
      expect(testCase.propositions.length).toBeGreaterThan(0);
      expect(testCase.ground_truth).toBeTypeOf("object");
    }
  });

  it("all test cases have valid ground truth for each person", () => {
    for (const testCase of clueTestCases) {
      for (const name of testCase.names) {
        const activity = testCase.ground_truth[name];
        expect(activity).toBeDefined();
        expect(activity?.technology).toBeTypeOf("string");
        expect(activity?.place).toBeTypeOf("string");
        expect(activity?.company).toBeTypeOf("string");
        expect(activity?.institution).toBeTypeOf("string");
        expect(activity?.food).toBeTypeOf("string");
        expect(activity?.material).toBeTypeOf("string");
      }
    }
  });

  it("all test cases have valid propositions", () => {
    for (const testCase of clueTestCases) {
      for (const proposition of testCase.propositions) {
        expect(proposition.prop_type).toBeTypeOf("string");
        expect([
          "person_and_attribute",
          "person_or_person",
          "person_attribute_implies_not_killer",
          "complex_or",
          "direct_elimination",
        ]).toContain(proposition.prop_type);
      }
    }
  });

  it("killer is one of the names in each test case", () => {
    for (const testCase of clueTestCases) {
      expect(testCase.names).toContain(testCase.killer);
    }
  });

  it("has expected average number of propositions", () => {
    const totalPropositions = clueTestCases.reduce(
      (sum, testCase) => sum + testCase.propositions.length,
      0,
    );
    const avgPropositions = totalPropositions / clueTestCases.length;

    // Based on generation output, we expect around 71-72 propositions on average
    expect(avgPropositions).toBeGreaterThan(50);
    expect(avgPropositions).toBeLessThan(100);
  });

  it("all seeds are unique", () => {
    const seeds = clueTestCases.map((tc) => tc.seed);
    const uniqueSeeds = new Set(seeds);
    expect(uniqueSeeds.size).toBe(clueTestCases.length);
  });
});
