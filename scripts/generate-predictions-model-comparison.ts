/**
 * Run predictions on validation cases across multiple models and dump to JSON.
 * Uses rate limiting to avoid overwhelming the API.
 *
 * Evaluates on the validation set (disjoint from fine-tuning training data).
 * Compares: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, and all fine-tuned models.
 *
 * Run with: pnpm script scripts/generate-predictions-model-comparison.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import { clueValidationCases } from "../lib/clue-test-cases";
import {
  type OpenAIModelThatGivesLogProbs,
  propositionsToPredictedName,
  queue,
} from "../lib/predict";
import type {
  ModelComparisonPredictions,
  PredictedTestCase,
} from "../lib/schemas";
import { fineTunedModelSlugs } from "../lib/schemas";

const modelsToCompare: OpenAIModelThatGivesLogProbs[] = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  ...Object.values(fineTunedModelSlugs),
];

const testCasesToProcess = clueValidationCases;

async function processSingleTestCase(
  game: (typeof clueValidationCases)[number],
  model: OpenAIModelThatGivesLogProbs,
  index: number,
): Promise<PredictedTestCase> {
  try {
    const result = await propositionsToPredictedName(game, model);
    const correctness = result.name === game.killer;

    return {
      game,
      predictionData: {
        prediction: result.name,
        correctness,
        confidence: result.confidence,
        metadata: {
          model,
        },
      },
    };
  } catch (error) {
    console.error(
      `\n  Error processing test case ${index + 1} (seed: ${game.seed}) with model ${model}:`,
      error,
    );
    throw error;
  }
}

async function generatePredictionsForModel(
  model: OpenAIModelThatGivesLogProbs,
): Promise<PredictedTestCase[]> {
  console.log(`\n  Model: ${model}`);
  console.log(`  ${"─".repeat(56)}`);

  const predictions: PredictedTestCase[] = [];
  let completed = 0;
  let correct = 0;
  const startTime = Date.now();

  const promises = testCasesToProcess.map((game, index) =>
    queue.add(async () => {
      const prediction = await processSingleTestCase(game, model, index);
      predictions.push(prediction);
      completed++;
      if (prediction.predictionData.correctness) {
        correct++;
      }

      if (completed % 10 === 0 || completed === testCasesToProcess.length) {
        const elapsed = Date.now() - startTime;
        const rate = (completed / elapsed) * 1000 * 60;
        const accuracy = (correct / completed) * 100;
        console.log(
          `  Progress: ${completed}/${testCasesToProcess.length} | ` +
            `Accuracy: ${accuracy.toFixed(1)}% | ` +
            `Rate: ${rate.toFixed(1)} req/min`,
        );
      }

      return prediction;
    }),
  );

  await Promise.all(promises);

  // Sort by original order (by seed)
  predictions.sort((a, b) => a.game.seed - b.game.seed);

  const duration = Date.now() - startTime;
  const accuracy = (correct / completed) * 100;

  console.log(
    `  Completed: ${predictions.length} predictions in ${(duration / 1000).toFixed(1)}s`,
  );
  console.log(`  Accuracy: ${accuracy.toFixed(1)}% (${correct}/${completed})`);

  return predictions;
}

async function generateModelComparison() {
  console.log("Generating model comparison predictions\n");
  console.log("=".repeat(60));
  console.log(`  Total test cases: ${testCasesToProcess.length}`);
  console.log(`  Models to compare: ${modelsToCompare.length}`);
  for (const model of modelsToCompare) {
    console.log(`    - ${model}`);
  }
  console.log(
    `  Total requests: ${testCasesToProcess.length * modelsToCompare.length}`,
  );
  console.log(`${"=".repeat(60)}`);

  const results: ModelComparisonPredictions = {};

  for (const model of modelsToCompare) {
    const predictions = await generatePredictionsForModel(model);
    results[model] = predictions;
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Summary:\n");

  for (const model of modelsToCompare) {
    const predictions = results[model];
    if (!predictions) continue;
    const correct = predictions.filter(
      (p) => p.predictionData.correctness,
    ).length;
    const accuracy = (correct / predictions.length) * 100;
    console.log(
      `  ${model}: ${accuracy.toFixed(1)}% (${correct}/${predictions.length})`,
    );
  }

  console.log(`${"=".repeat(60)}\n`);

  // Write to file
  const outputPath = path.join(
    process.cwd(),
    "lib",
    "clue-predictions-model-comparison.json",
  );
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`Wrote model comparison predictions to ${outputPath}\n`);
}

generateModelComparison().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
