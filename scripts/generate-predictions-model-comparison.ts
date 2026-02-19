/**
 * Run predictions on validation cases across multiple models and dump to JSON.
 * Uses rate limiting to avoid overwhelming the API.
 *
 * Evaluates on the validation set (disjoint from fine-tuning training data).
 * Compares: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, and all fine-tuned models.
 *
 * Each model's results are cached to out/single-model-<slug>.json so that
 * re-runs skip models that have already been evaluated.
 *
 * Run with: pnpm script scripts/generate-predictions-model-comparison.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import pRetry from "p-retry";
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
import { fineTunedModelSlugs, predictedTestCasesSchema } from "../lib/schemas";

const modelsToCompare: OpenAIModelThatGivesLogProbs[] = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  ...Object.values(fineTunedModelSlugs),
];

const testCasesToProcess = clueValidationCases;

const OUT_DIR = path.join(process.cwd(), "out");

/** Convert a model name to a filesystem-safe slug */
function modelToFileSlug(model: string): string {
  return model.replaceAll(":", "-").replaceAll("/", "-");
}

function cachedFilePath(model: string): string {
  return path.join(OUT_DIR, `single-model-${modelToFileSlug(model)}.json`);
}

/** Try to load cached predictions for a model. Returns null if not found or invalid. */
async function loadCachedPredictions(
  model: OpenAIModelThatGivesLogProbs,
): Promise<PredictedTestCase[] | null> {
  const filePath = cachedFilePath(model);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = predictedTestCasesSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return null;
  }
}

/** Save predictions for a model to the cache file. */
async function savePredictions(
  model: OpenAIModelThatGivesLogProbs,
  predictions: PredictedTestCase[],
): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    cachedFilePath(model),
    JSON.stringify(predictions, null, 2),
  );
}

async function processSingleTestCase(
  game: (typeof clueValidationCases)[number],
  model: OpenAIModelThatGivesLogProbs,
  index: number,
): Promise<PredictedTestCase> {
  const result = await pRetry(() => propositionsToPredictedName(game, model), {
    retries: 3,
    onFailedAttempt: (error) => {
      console.warn(
        `\n  Retry ${error.attemptNumber}/3 for test case ${index + 1} (seed: ${game.seed}) with model ${model}: ${error.error.message}`,
      );
    },
  });
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
}

async function generatePredictionsForModel(
  model: OpenAIModelThatGivesLogProbs,
): Promise<PredictedTestCase[]> {
  console.log(`\n  Model: ${model}`);
  console.log(`  ${"─".repeat(56)}`);

  // Check for cached results
  const cached = await loadCachedPredictions(model);
  if (cached) {
    const correct = cached.filter((p) => p.predictionData.correctness).length;
    const accuracy = (correct / cached.length) * 100;
    console.log(`  Loaded from cache: ${cached.length} predictions`);
    console.log(
      `  Accuracy: ${accuracy.toFixed(1)}% (${correct}/${cached.length})`,
    );
    return cached;
  }

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

  // Cache results to disk
  await savePredictions(model, predictions);
  console.log(`  Saved to ${cachedFilePath(model)}`);

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

  // Write combined results to file
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
