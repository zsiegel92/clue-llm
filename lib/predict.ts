import { openai, type OpenAIChatLanguageModelOptions } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getLogProbsFromGenerateTextResponse,
  getMinTokenConfidence,
} from "./logprob-utils";
import type { OpenAIModelThatGivesLogProbs, SerializedGame } from "./schemas";
import { gameToPrompt } from "./ui";
import PQueue from "p-queue";
/**
 * Number of few-shot examples to include in the prompt.
 * Experiments show 3 examples provides optimal performance.
 */
const NUMBER_OF_FEWSHOT_EXAMPLES_TO_INCLUDE = 0;

const CONCURRENCY_MAX = 10;
const RATE_LIMIT_WINDOW = 15_000;
const RATE_LIMIT_NUMBER_ALLOWED = 50;

export const queue = new PQueue({
  concurrency: CONCURRENCY_MAX,
  interval: RATE_LIMIT_WINDOW,
  intervalCap: RATE_LIMIT_NUMBER_ALLOWED,
});

/**
 * Schema for the LLM output when predicting the killer
 */
const killerPredictionSchema = z.object({
  killer: z.string().describe("The name of the person who is the killer"),
});

/**
 * Result of a killer prediction with confidence score
 */
export type PredictionResult = {
  name: string;
  confidence: number | undefined;
};

// Re-export for convenience
export type { OpenAIModelThatGivesLogProbs };
/**
 * Predicts the killer from a clue game using an LLM.
 * Returns the predicted name and the model's confidence in that prediction.
 *
 * @param game - The serialized clue game with propositions
 * @param modelName - The OpenAI model to use (default: gpt-4o-mini)
 * @returns The predicted killer's name and confidence score (0-1)
 */
export async function propositionsToPredictedName(
  game: SerializedGame,
  modelName: OpenAIModelThatGivesLogProbs,
): Promise<PredictionResult> {
  const prompt = gameToPrompt(game, NUMBER_OF_FEWSHOT_EXAMPLES_TO_INCLUDE);

  const result = await generateText({
    model: openai.chat(modelName),
    output: Output.object({ schema: killerPredictionSchema }),
    prompt,
    providerOptions: {
      openai: {
        logprobs: true,
      } satisfies OpenAIChatLanguageModelOptions,
    },
    temperature: 0,
  });

  const prediction = result.output;

  // Extract confidence from log probabilities
  const logprobs = getLogProbsFromGenerateTextResponse(result);
  const confidence = logprobs
    ? getMinTokenConfidence(logprobs, "killer")
    : undefined;

  return {
    name: prediction.killer,
    confidence,
  };
}
