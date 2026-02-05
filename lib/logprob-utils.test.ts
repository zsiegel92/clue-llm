import { describe, expect, it } from "vitest";
import {
  extractFieldLogprobs,
  getAvgTokenConfidence,
  getLogProbsFromGenerateTextResponse,
  getMinTokenConfidence,
  logprobToConfidence,
  type TokenAndLogprob,
} from "./logprob-utils";

describe("logprobToConfidence", () => {
  it("converts log probabilities to confidence values", () => {
    expect(logprobToConfidence(0)).toBeCloseTo(1.0);
    expect(logprobToConfidence(-Math.LN2)).toBeCloseTo(0.5, 2);
    expect(logprobToConfidence(-Math.LN10)).toBeCloseTo(0.1, 2);
  });
});

describe("extractFieldLogprobs", () => {
  it("extracts logprobs for a single-token field value", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "answer", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Smith", logprob: -0.5 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = extractFieldLogprobs(mockLogprobs, "answer");
    expect(result).toHaveLength(1);
    expect(result?.[0]?.token).toBe("Smith");
    expect(result?.[0]?.logprob).toBe(-0.5);
  });

  it("excludes JSON syntax tokens like quotes and colons", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "name", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Johnson", logprob: -1.2 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = extractFieldLogprobs(mockLogprobs, "name");
    expect(result).toHaveLength(1);
    expect(result?.[0]?.token).toBe("Johnson");
    // Quotes and colons should be excluded
    expect(result?.every((t) => !t.token.includes('"'))).toBe(true);
    expect(result?.every((t) => !t.token.includes(":"))).toBe(true);
  });

  it("handles fields that appear after other fields", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "first", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "A", logprob: -0.1 },
      { token: '"', logprob: 0 },
      { token: ",", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "second", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "B", logprob: -0.3 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = extractFieldLogprobs(mockLogprobs, "second");
    expect(result).toHaveLength(1);
    expect(result?.[0]?.token).toBe("B");
    expect(result?.[0]?.logprob).toBe(-0.3);
  });

  it("returns undefined for non-existent fields", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "name", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Smith", logprob: -0.5 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = extractFieldLogprobs(mockLogprobs, "nonexistent");
    expect(result).toBeUndefined();
  });

  it("handles empty logprobs array", () => {
    const result = extractFieldLogprobs([], "answer");
    expect(result).toBeUndefined();
  });
});

describe("getMinTokenConfidence", () => {
  it("returns the minimum confidence across all tokens", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "answer", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Smith", logprob: -0.5 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = getMinTokenConfidence(mockLogprobs, "answer");
    expect(result).toBeCloseTo(Math.exp(-0.5), 5);
  });

  it("returns undefined for non-existent fields", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "answer", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Smith", logprob: -0.5 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = getMinTokenConfidence(mockLogprobs, "nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("getAvgTokenConfidence", () => {
  it("returns the average confidence across all tokens", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "answer", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Smith", logprob: -0.5 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = getAvgTokenConfidence(mockLogprobs, "answer");
    expect(result).toBeCloseTo(Math.exp(-0.5), 5);
  });

  it("returns undefined for non-existent fields", () => {
    const mockLogprobs: TokenAndLogprob[] = [
      { token: "{", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "answer", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: ":", logprob: 0 },
      { token: '"', logprob: 0 },
      { token: "Smith", logprob: -0.5 },
      { token: '"', logprob: 0 },
      { token: "}", logprob: 0 },
    ];

    const result = getAvgTokenConfidence(mockLogprobs, "nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("getLogProbsFromGenerateTextResponse", () => {
  it("extracts logprobs from a valid response", () => {
    const mockResponse = {
      response: {
        body: {
          choices: [
            {
              message: { content: '{"answer":"Smith"}' },
              logprobs: {
                content: [
                  { token: "{", logprob: 0 },
                  { token: '"answer"', logprob: 0 },
                  { token: ":", logprob: 0 },
                  { token: '"Smith"', logprob: -0.5 },
                  { token: "}", logprob: 0 },
                ],
              },
            },
          ],
        },
      },
      output: { answer: "Smith" },
    };

    const result = getLogProbsFromGenerateTextResponse(mockResponse as never);
    expect(result).toHaveLength(5);
    expect(result?.[3]?.token).toBe('"Smith"');
  });

  it("returns undefined for invalid response structure", () => {
    const mockResponse = {
      response: {
        body: {
          invalid: "structure",
        },
      },
    };

    const result = getLogProbsFromGenerateTextResponse(mockResponse as never);
    expect(result).toBeUndefined();
  });
});
