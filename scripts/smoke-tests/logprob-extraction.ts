/**
 * Smoke test for log probability extraction with real OpenAI API calls.
 * This demonstrates extracting confidence scores from structured output.
 *
 * Run with: pnpm script scripts/smoke-tests/logprob-extraction.ts
 */

import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  extractFieldLogprobs,
  getAvgTokenConfidence,
  getLogProbsFromGenerateTextResponse,
  getMinTokenConfidence,
  logprobToConfidence,
} from "../../lib/logprob-utils";

// Schema for testing - using single-token string values
const countrySchema = z.object({
  bestCountry: z.string(),
  reason: z.string(),
});

async function testLogprobExtraction() {
  console.log("🧪 Running log probability extraction smoke test\n");
  console.log("=".repeat(60));

  // Use an ambiguous prompt where the model might be uncertain
  const prompt = `What's the best country out of these options: France, Japan, Brazil, Canada?

Choose one and explain why in a single word (like "culture" or "nature" or "food").

Your response should be somewhat uncertain - there's no objectively correct answer.`;

  console.log("📝 Prompt:");
  console.log(prompt);
  console.log(`\n${"=".repeat(60)}\n`);

  const result = await generateText({
    model: openai.chat("gpt-4o-mini"),
    output: Output.object({ schema: countrySchema }),
    prompt,
    providerOptions: {
      openai: {
        logprobs: true,
      },
    },
  });

  console.log("✅ Model output:");
  console.log(JSON.stringify(result.output, null, 2));
  console.log(`\n${"=".repeat(60)}\n`);

  // Extract log probabilities
  const logprobs = getLogProbsFromGenerateTextResponse(result);

  if (!logprobs) {
    console.error("❌ Failed to extract log probabilities");
    process.exit(1);
  }

  console.log(
    `📊 Extracted ${logprobs.length} tokens with log probabilities\n`,
  );

  // Show all tokens and their logprobs
  console.log("All tokens:");
  for (const { token, logprob } of logprobs) {
    const confidence = logprobToConfidence(logprob);
    const confidencePercent = (confidence * 100).toFixed(1);
    console.log(
      `  Token: ${JSON.stringify(token).padEnd(20)} | Logprob: ${logprob.toFixed(4).padStart(8)} | Confidence: ${confidencePercent}%`,
    );
  }
  console.log(`\n${"=".repeat(60)}\n`);

  // Extract field-specific logprobs
  console.log("Field-specific analysis:\n");

  for (const fieldName of ["bestCountry", "reason"] as const) {
    const fieldLogprobs = extractFieldLogprobs(logprobs, fieldName);

    if (!fieldLogprobs) {
      console.log(`  ${fieldName}: No logprobs found`);
      continue;
    }

    const minConfidence = getMinTokenConfidence(logprobs, fieldName);
    const avgConfidence = getAvgTokenConfidence(logprobs, fieldName);

    console.log(`  ${fieldName}:`);
    console.log(`    Value: "${result.output[fieldName]}"`);
    console.log(`    Tokens in value: ${fieldLogprobs.length}`);
    console.log(
      `    Min confidence: ${minConfidence ? `${(minConfidence * 100).toFixed(1)}%` : "N/A"}`,
    );
    console.log(
      `    Avg confidence: ${avgConfidence ? `${(avgConfidence * 100).toFixed(1)}%` : "N/A"}`,
    );
    console.log(`    Token details:`);

    for (const { token, logprob } of fieldLogprobs) {
      const confidence = logprobToConfidence(logprob);
      console.log(
        `      - Token: ${JSON.stringify(token)} | Confidence: ${(confidence * 100).toFixed(1)}%`,
      );
    }
    console.log();
  }

  console.log("=".repeat(60));
  console.log("\n✅ Smoke test completed successfully!\n");

  // Check if model had low confidence on at least one token
  const allConfidences = logprobs.map((lp) => logprobToConfidence(lp.logprob));
  const minOverallConfidence = Math.min(...allConfidences);

  if (minOverallConfidence < 1.0) {
    console.log(
      `✨ Good! Model showed some uncertainty (min confidence: ${(minOverallConfidence * 100).toFixed(1)}%)`,
    );
  } else {
    console.log(
      "⚠️  Note: Model was 100% confident on all tokens. Try a more ambiguous prompt.",
    );
  }
}

testLogprobExtraction().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
