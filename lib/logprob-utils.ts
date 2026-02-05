import type { generateText } from "ai";
import { z } from "zod";

/**
 * Represents a token with its log probability
 */
export type TokenAndLogprob = {
  token: string;
  logprob: number;
};

/**
 * Schema for validating OpenAI response structure with logprobs
 */
const responseSchema = z.object({
  body: z.object({
    choices: z.array(
      z.object({
        message: z.object({ content: z.string() }),
        logprobs: z.object({
          content: z.array(
            z.object({
              token: z.string(),
              logprob: z.number(),
            }),
          ),
        }),
      }),
    ),
  }),
});

/**
 * Extracts log probabilities from a generateText response
 */
export function getLogProbsFromGenerateTextResponse(
  result: Awaited<ReturnType<typeof generateText>>,
): TokenAndLogprob[] | undefined {
  try {
    const responseValidated = responseSchema.parse(result.response);
    return responseValidated.body.choices?.[0]?.logprobs?.content;
  } catch {
    return undefined;
  }
}

/**
 * Finds the character range for a JSON value associated with a given key
 * Returns [start, end] indices in the full JSON string
 */
function findJsonValueRange(
  fullJson: string,
  key: string,
): [number, number] | undefined {
  const keyPattern = `"${key}":`;
  const keyStart = fullJson.indexOf(keyPattern);
  if (keyStart === -1) return undefined;

  const valueStart = keyStart + keyPattern.length;
  const restAfterKey = fullJson.slice(valueStart);

  // Find the end of the value (next comma or closing brace)
  const nextComma = restAfterKey.indexOf(",");
  const nextBrace = restAfterKey.indexOf("}");
  const valueEnd =
    nextComma !== -1 && nextBrace !== -1
      ? Math.min(nextComma, nextBrace)
      : nextComma !== -1
        ? nextComma
        : nextBrace;

  if (valueEnd === -1) return undefined;

  return [valueStart, valueStart + valueEnd];
}

/**
 * Extracts logprobs for tokens that are part of a specific field's value.
 *
 * This works by:
 * 1. Reconstructing the full JSON output from token strings
 * 2. Finding the character range for the field's value
 * 3. Extracting logprobs for tokens within that range (excluding JSON syntax tokens)
 *
 * @param logProbEntries - All token/logprob pairs from the response
 * @param key - The field name to extract logprobs for
 * @returns Array of logprobs for the field's value tokens, or undefined if not found
 */
export function extractFieldLogprobs(
  logProbEntries: TokenAndLogprob[],
  key: string,
): TokenAndLogprob[] | undefined {
  if (!logProbEntries || logProbEntries.length === 0) {
    return undefined;
  }

  // Reconstruct full JSON output
  let fullOutput = "";
  for (const entry of logProbEntries) {
    fullOutput += entry.token;
  }

  const valueRange = findJsonValueRange(fullOutput, key);
  if (!valueRange) return undefined;

  const [valueStart, valueEnd] = valueRange;

  // Extract tokens within the value range
  const extracted: TokenAndLogprob[] = [];
  let currentPos = 0;

  for (const logProbEntry of logProbEntries) {
    const tokenStart = currentPos;
    const tokenEnd = currentPos + logProbEntry.token.length;
    currentPos = tokenEnd;

    // Check if this token is within the value range
    if (tokenStart >= valueStart && tokenEnd <= valueEnd) {
      const token = logProbEntry.token;
      // Exclude JSON syntax tokens (quotes, colons)
      if (!token.includes('"') && !token.includes(":")) {
        extracted.push(logProbEntry);
      }
    }
  }

  return extracted.length > 0 ? extracted : undefined;
}

/**
 * Converts log probability to linear probability (0-1 scale)
 */
export function logprobToConfidence(logprob: number): number {
  return Math.exp(logprob);
}

/**
 * Calculates the minimum token confidence for a field.
 * This represents the lowest confidence the model had for any token in the field's value.
 *
 * @param logProbEntries - All token/logprob pairs from the response
 * @param key - The field name to get confidence for
 * @returns Minimum confidence (0-1) or undefined if field not found
 */
export function getMinTokenConfidence(
  logProbEntries: TokenAndLogprob[],
  key: string,
): number | undefined {
  const fieldLogprobs = extractFieldLogprobs(logProbEntries, key);
  if (!fieldLogprobs || fieldLogprobs.length === 0) return undefined;

  return fieldLogprobs.reduce<number | undefined>((min, logProb) => {
    const confidence = logprobToConfidence(logProb.logprob);
    if (min === undefined) {
      return confidence;
    }
    return Math.min(min, confidence);
  }, undefined);
}

/**
 * Calculates the average token confidence for a field.
 *
 * @param logProbEntries - All token/logprob pairs from the response
 * @param key - The field name to get confidence for
 * @returns Average confidence (0-1) or undefined if field not found
 */
export function getAvgTokenConfidence(
  logProbEntries: TokenAndLogprob[],
  key: string,
): number | undefined {
  const fieldLogprobs = extractFieldLogprobs(logProbEntries, key);
  if (!fieldLogprobs || fieldLogprobs.length === 0) return undefined;

  const sum = fieldLogprobs.reduce((acc, logProb) => {
    return acc + logprobToConfidence(logProb.logprob);
  }, 0);

  return sum / fieldLogprobs.length;
}
