/**
 * Generate four fine-tuning datasets from the predictions:
 * 1. 72 most confident but wrong test cases
 * 2. 72 least confident and wrong test cases
 * 3. 72 correct test cases
 * 4. All 500 test cases
 *
 * Run with: pnpm script scripts/generate-fine-tune-datasets.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { PredictedTestCase } from "../lib/schemas";
import { predictedTestCasesSchema } from "../lib/schemas";
import { gameToPrompt } from "../lib/ui";

interface OpenAIFineTuningMessage {
  role: "user" | "assistant";
  content: string;
}

interface OpenAIFineTuningExample {
  messages: OpenAIFineTuningMessage[];
}

/**
 * Convert a predicted test case to OpenAI fine-tuning format
 */
function testCaseToFineTuningExample(
  testCase: PredictedTestCase,
): OpenAIFineTuningExample {
  const userPrompt = gameToPrompt(testCase.game);
  const expectedAnswer = testCase.game.killer;

  return {
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
      {
        role: "assistant",
        content: expectedAnswer,
      },
    ],
  };
}

/**
 * Write fine-tuning examples to a JSONL file
 */
async function writeFineTuningDataset(
  examples: OpenAIFineTuningExample[],
  filename: string,
  outputDir: string,
): Promise<void> {
  const outputPath = path.join(outputDir, filename);
  const jsonlContent = examples.map((ex) => JSON.stringify(ex)).join("\n");
  await fs.writeFile(outputPath, jsonlContent, "utf-8");
  console.log(`✅ Wrote ${examples.length} examples to ${outputPath}`);
}

async function main() {
  console.log("🎯 Generating fine-tuning datasets\n");
  console.log("=".repeat(60));

  // Load predictions
  const predictionsPath = path.join(
    process.cwd(),
    "lib",
    "clue-predictions.json",
  );
  const fileContent = await fs.readFile(predictionsPath, "utf-8");
  const predictions = predictedTestCasesSchema.parse(JSON.parse(fileContent));

  console.log(`📂 Loaded ${predictions.length} predictions\n`);

  // Create output directory
  const outputDir = path.join(process.cwd(), "fine-tune-data");
  await fs.mkdir(outputDir, { recursive: true });
  console.log(`📁 Created output directory: ${outputDir}\n`);

  // Calculate statistics
  const correct = predictions.filter((p) => p.predictionData.correctness);
  const wrong = predictions.filter((p) => !p.predictionData.correctness);

  // Filter wrong predictions with confidence values
  const wrongWithConfidence = wrong.filter(
    (p) => p.predictionData.confidence !== undefined,
  );

  console.log("📊 Statistics:");
  console.log(`  Total predictions: ${predictions.length}`);
  console.log(`  Correct: ${correct.length}`);
  console.log(`  Wrong: ${wrong.length}`);
  console.log(`  Wrong with confidence: ${wrongWithConfidence.length}\n`);

  // Dataset 1: 72 most confident but wrong
  const mostConfidentWrong = wrongWithConfidence
    .sort((a, b) => {
      const confA = a.predictionData.confidence ?? 0;
      const confB = b.predictionData.confidence ?? 0;
      return confB - confA; // descending
    })
    .slice(0, 72);

  const mostConfidentWrongExamples = mostConfidentWrong.map(
    testCaseToFineTuningExample,
  );
  await writeFineTuningDataset(
    mostConfidentWrongExamples,
    "most-confident-wrong.jsonl",
    outputDir,
  );

  if (mostConfidentWrong.length > 0) {
    const avgConf =
      mostConfidentWrong.reduce(
        (sum, p) => sum + (p.predictionData.confidence ?? 0),
        0,
      ) / mostConfidentWrong.length;
    console.log(`   Average confidence: ${(avgConf * 100).toFixed(1)}%`);
    console.log(
      `   Confidence range: ${((mostConfidentWrong[mostConfidentWrong.length - 1].predictionData.confidence ?? 0) * 100).toFixed(1)}% - ${((mostConfidentWrong[0].predictionData.confidence ?? 0) * 100).toFixed(1)}%\n`,
    );
  }

  // Dataset 2: 72 least confident and wrong
  const leastConfidentWrong = wrongWithConfidence
    .sort((a, b) => {
      const confA = a.predictionData.confidence ?? 0;
      const confB = b.predictionData.confidence ?? 0;
      return confA - confB; // ascending
    })
    .slice(0, 72);

  const leastConfidentWrongExamples = leastConfidentWrong.map(
    testCaseToFineTuningExample,
  );
  await writeFineTuningDataset(
    leastConfidentWrongExamples,
    "least-confident-wrong.jsonl",
    outputDir,
  );

  if (leastConfidentWrong.length > 0) {
    const avgConf =
      leastConfidentWrong.reduce(
        (sum, p) => sum + (p.predictionData.confidence ?? 0),
        0,
      ) / leastConfidentWrong.length;
    console.log(`   Average confidence: ${(avgConf * 100).toFixed(1)}%`);
    console.log(
      `   Confidence range: ${((leastConfidentWrong[0].predictionData.confidence ?? 0) * 100).toFixed(1)}% - ${((leastConfidentWrong[leastConfidentWrong.length - 1].predictionData.confidence ?? 0) * 100).toFixed(1)}%\n`,
    );
  }

  // Dataset 3: 72 correct test cases
  const correctSubset = correct.slice(0, 72);
  const correctExamples = correctSubset.map(testCaseToFineTuningExample);
  await writeFineTuningDataset(correctExamples, "correct.jsonl", outputDir);

  if (
    correctSubset.length > 0 &&
    correctSubset[0].predictionData.confidence !== undefined
  ) {
    const withConf = correctSubset.filter(
      (p) => p.predictionData.confidence !== undefined,
    );
    if (withConf.length > 0) {
      const avgConf =
        withConf.reduce(
          (sum, p) => sum + (p.predictionData.confidence ?? 0),
          0,
        ) / withConf.length;
      console.log(
        `   Average confidence: ${(avgConf * 100).toFixed(1)}% (${withConf.length}/${correctSubset.length} with confidence)\n`,
      );
    }
  } else {
    console.log("");
  }

  // Dataset 4: All 500 test cases
  const allExamples = predictions.map(testCaseToFineTuningExample);
  await writeFineTuningDataset(allExamples, "all-cases.jsonl", outputDir);
  console.log("");

  console.log("=".repeat(60));
  console.log("✅ All datasets generated successfully!\n");
  console.log("📋 Summary:");
  console.log(
    `  1. most-confident-wrong.jsonl: ${mostConfidentWrongExamples.length} examples`,
  );
  console.log(
    `  2. least-confident-wrong.jsonl: ${leastConfidentWrongExamples.length} examples`,
  );
  console.log(`  3. correct.jsonl: ${correctExamples.length} examples`);
  console.log(`  4. all-cases.jsonl: ${allExamples.length} examples`);
  console.log(`\n📁 All files written to: ${outputDir}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
