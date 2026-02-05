import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getLogProbsFromGenerateTextResponse,
  getMinTokenConfidence,
} from "./logprob-utils";
import type { SerializedGame } from "./schemas";
import { gameToPrompt } from "./ui";

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

export type OpenAIModelThatGivesLogProbs =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4.1";
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
  const prompt = gameToPrompt(game);

  const result = await generateText({
    model: openai.chat(modelName),
    output: Output.object({ schema: killerPredictionSchema }),
    prompt,
    providerOptions: {
      openai: {
        logprobs: true,
      },
    },
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
