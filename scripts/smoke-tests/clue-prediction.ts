/**
 * Smoke test for clue game prediction with real OpenAI API calls.
 * This demonstrates the full pipeline: game -> prompt -> LLM -> prediction with confidence.
 *
 * Run with: pnpm script scripts/smoke-tests/clue-prediction.ts
 */

import { clueTestCases } from "../../lib/clue-test-cases";
import {
  propositionsToPredictedName,
  type OpenAIModelThatGivesLogProbs,
} from "../../lib/predict";
import { gameToPrompt } from "../../lib/ui";

const model: OpenAIModelThatGivesLogProbs = "gpt-4.1-nano";

async function testCluePrediction() {
  console.log("🎮 Running clue game prediction smoke test\n");
  console.log("=".repeat(60));
  const randomIndex = Math.floor(Math.random() * clueTestCases.length);
  const game = clueTestCases[randomIndex];

  console.log("📋 Test Game Details:");
  console.log(`  Seed: ${game.seed}`);
  console.log(`  Actual killer: ${game.killer}`);
  console.log(`  Number of suspects: ${game.names.length}`);
  console.log(`  Number of propositions: ${game.propositions.length}`);
  console.log(`\n${"=".repeat(60)}\n`);

  // Show the prompt that will be sent to the LLM
  const prompt = gameToPrompt(game);
  console.log("📝 Generated Prompt:");
  console.log("-".repeat(60));
  console.log(prompt);
  console.log(`${"-".repeat(60)}\n`);

  console.log("🤖 Sending to OpenAI for prediction...\n");

  const startTime = Date.now();
  const result = await propositionsToPredictedName(game, model);
  const duration = Date.now() - startTime;

  console.log("=".repeat(60));
  console.log("📊 Prediction Results:\n");
  console.log(`  Predicted killer: ${result.name}`);
  console.log(`  Actual killer: ${game.killer}`);
  console.log(`  Correct: ${result.name === game.killer ? "✅ YES" : "❌ NO"}`);
  console.log(
    `  Confidence: ${result.confidence !== undefined ? `${(result.confidence * 100).toFixed(1)}%` : "N/A"}`,
  );
  console.log(`  Time taken: ${duration}ms`);
  console.log(`\n${"=".repeat(60)}`);

  if (result.confidence !== undefined) {
    if (result.confidence >= 0.9) {
      console.log("✨ Model was highly confident in its prediction");
    } else if (result.confidence >= 0.7) {
      console.log("✨ Model was moderately confident in its prediction");
    } else if (result.confidence >= 0.5) {
      console.log("⚠️  Model had low confidence - the puzzle may be ambiguous");
    } else {
      console.log("⚠️  Model had very low confidence in its prediction");
    }
  }

  console.log("\n✅ Smoke test completed successfully!");

  if (result.name !== game.killer) {
    console.log(
      "\n⚠️  Note: The model made an incorrect prediction. This may be expected",
    );
    console.log(
      "   for difficult puzzles or if the model needs more reasoning capability.",
    );
  }
}

testCluePrediction().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
