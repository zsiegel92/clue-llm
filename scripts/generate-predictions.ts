/**
 * Run predictions on all test cases and dump to JSON.
 * Uses rate limiting to avoid overwhelming the API.
 *
 * Run with: pnpm script scripts/generate-predictions.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import PQueue from "p-queue";
import { clueTestCases } from "../lib/clue-test-cases";
import {
  type OpenAIModelThatGivesLogProbs,
  propositionsToPredictedName,
} from "../lib/predict";
import type { PredictedTestCase } from "../lib/schemas";

const model: OpenAIModelThatGivesLogProbs = "gpt-4.1-nano";

// Process all test cases
const testCasesToProcess = clueTestCases;

// Rate limit: 100 requests per minute for enterprise accounts
// Using concurrency of 10 with interval of 6000ms = 100 req/min
const queue = new PQueue({
  concurrency: 10,
  interval: 6000,
  intervalCap: 10,
});

async function processSingleTestCase(
  game: (typeof clueTestCases)[number],
  index: number,
): Promise<PredictedTestCase> {
  try {
    const result = await propositionsToPredictedName(game, model);
    const correctness = result.name === game.killer;

    return {
      ...game,
      prediction: result.name,
      correctness,
      confidence: result.confidence,
      metadata: {
        model,
      },
    };
  } catch (error) {
    console.error(
      `\n❌ Error processing test case ${index + 1} (seed: ${game.seed}):`,
      error,
    );
    throw error;
  }
}

async function generatePredictions() {
  console.log("🎮 Generating predictions for test cases\n");
  console.log("=".repeat(60));
  console.log(`  Total test cases available: ${clueTestCases.length}`);
  console.log(`  Processing: ${testCasesToProcess.length}`);
  console.log(`  Model: ${model}`);
  console.log(`  Rate limit: ~100 requests/minute`);
  console.log(
    `  Estimated time: ~${Math.ceil(testCasesToProcess.length / 100)} minutes`,
  );
  console.log(`${"=".repeat(60)}\n`);

  const predictions: PredictedTestCase[] = [];
  let completed = 0;
  let correct = 0;

  const startTime = Date.now();

  // Process all test cases with rate limiting
  const promises = testCasesToProcess.map((game, index) =>
    queue.add(async () => {
      const prediction = await processSingleTestCase(game, index);
      predictions.push(prediction);
      completed++;
      if (prediction.correctness) {
        correct++;
      }

      // Log progress every 10 completions
      if (completed % 10 === 0 || completed === testCasesToProcess.length) {
        const elapsed = Date.now() - startTime;
        const rate = (completed / elapsed) * 1000 * 60; // per minute
        const accuracy = (correct / completed) * 100;
        console.log(
          `Progress: ${completed}/${testCasesToProcess.length} | ` +
            `Accuracy: ${accuracy.toFixed(1)}% | ` +
            `Rate: ${rate.toFixed(1)} req/min`,
        );
      }

      return prediction;
    }),
  );

  await Promise.all(promises);

  // Sort by original order (by seed)
  predictions.sort((a, b) => a.seed - b.seed);

  const duration = Date.now() - startTime;
  const accuracy = (correct / completed) * 100;

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 Final Results:\n");
  console.log(`  Total predictions: ${predictions.length}`);
  console.log(`  Correct: ${correct} (${accuracy.toFixed(1)}%)`);
  console.log(`  Incorrect: ${completed - correct}`);
  console.log(`  Time taken: ${(duration / 1000).toFixed(1)}s`);
  console.log(`${"=".repeat(60)}\n`);

  // Calculate average confidence for correct vs incorrect
  const correctPredictions = predictions.filter((p) => p.correctness);
  const incorrectPredictions = predictions.filter((p) => !p.correctness);

  const avgConfidenceCorrect =
    correctPredictions
      .filter((p) => p.confidence !== undefined)
      .reduce((sum, p) => sum + (p.confidence ?? 0), 0) /
    correctPredictions.filter((p) => p.confidence !== undefined).length;

  const avgConfidenceIncorrect =
    incorrectPredictions
      .filter((p) => p.confidence !== undefined)
      .reduce((sum, p) => sum + (p.confidence ?? 0), 0) /
    incorrectPredictions.filter((p) => p.confidence !== undefined).length;

  console.log("📈 Confidence Analysis:\n");
  console.log(
    `  Avg confidence (correct): ${(avgConfidenceCorrect * 100).toFixed(1)}%`,
  );
  console.log(
    `  Avg confidence (incorrect): ${(avgConfidenceIncorrect * 100).toFixed(1)}%`,
  );
  console.log("");

  // Write to file
  const outputPath = path.join(process.cwd(), "lib", "clue-predictions.json");
  await fs.writeFile(outputPath, JSON.stringify(predictions, null, 2));

  console.log(`✅ Wrote predictions to ${outputPath}\n`);
}

generatePredictions().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
