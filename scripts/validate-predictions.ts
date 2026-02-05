/**
 * Validate the predictions JSON file against the schema.
 * This ensures the types/schemas are wired up properly.
 *
 * Run with: pnpm script scripts/validate-predictions.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import { predictedTestCasesSchema } from "../lib/schemas";

async function validatePredictions() {
  console.log("🔍 Validating predictions file\n");
  console.log("=".repeat(60));

  const filePath = path.join(process.cwd(), "lib", "clue-predictions.json");

  try {
    // Read the file
    const fileContent = await fs.readFile(filePath, "utf-8");
    console.log(`📂 Reading file: ${filePath}`);

    // Parse JSON
    const data = JSON.parse(fileContent);
    console.log(`✅ Valid JSON with ${data.length} entries\n`);

    // Validate against schema
    console.log("🔎 Validating against schema...");
    const predictions = predictedTestCasesSchema.parse(data);

    console.log("✅ Schema validation passed!\n");
    console.log("=".repeat(60));
    console.log("📊 Validation Summary:\n");
    console.log(`  Total predictions: ${predictions.length}`);

    // Calculate stats
    const correct = predictions.filter((p) => p.correctness).length;
    const incorrect = predictions.length - correct;
    const accuracy = (correct / predictions.length) * 100;

    console.log(`  Correct predictions: ${correct}`);
    console.log(`  Incorrect predictions: ${incorrect}`);
    console.log(`  Accuracy: ${accuracy.toFixed(1)}%`);

    // Check confidence data
    const withConfidence = predictions.filter(
      (p) => p.confidence !== undefined,
    ).length;
    console.log(`  With confidence data: ${withConfidence}`);

    // Check metadata
    const models = new Set(predictions.map((p) => p.metadata.model));
    console.log(`  Models used: ${Array.from(models).join(", ")}`);

    console.log("\n=".repeat(60));

    // Show a few examples
    console.log("\n📋 Sample Predictions:\n");
    for (let i = 0; i < Math.min(3, predictions.length); i++) {
      const p = predictions[i];
      console.log(`  [${i + 1}] Seed ${p.seed}:`);
      console.log(`      Killer: ${p.killer}`);
      console.log(`      Prediction: ${p.prediction}`);
      console.log(
        `      Correct: ${p.correctness ? "✅" : "❌"} | Confidence: ${p.confidence !== undefined ? `${(p.confidence * 100).toFixed(1)}%` : "N/A"}`,
      );
      console.log(`      Model: ${p.metadata.model}`);
      console.log("");
    }

    console.log("✅ All validations passed successfully!\n");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`❌ File not found: ${filePath}`);
      console.error(
        "   Run 'pnpm script scripts/generate-predictions.ts' first to generate the file.\n",
      );
    } else if (error instanceof SyntaxError) {
      console.error("❌ Invalid JSON format in file\n");
      console.error(error.message);
    } else if (error instanceof Error && error.name === "ZodError") {
      console.error("❌ Schema validation failed\n");
      console.error(error.message);
    } else {
      console.error("❌ Unexpected error:", error);
    }
    process.exit(1);
  }
}

validatePredictions().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
