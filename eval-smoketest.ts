import PQueue from "p-queue";
import { clueTestCases } from "./lib/clue-test-cases";
import type { OpenAIModelThatGivesLogProbs } from "./lib/predict";
import { propositionsToPredictedName } from "./lib/predict";

const NUMBER_EXAMPLES_TO_EVAL = 20;
const MODEL_TO_EVAL: OpenAIModelThatGivesLogProbs = "gpt-4.1-nano";
const CONCURRENCY_MAX = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const RATE_LIMIT_NUMBER_ALLOWED = 50;

async function runEval() {
  // Use first NUMBER_EXAMPLES_TO_EVAL test cases
  const testCases = clueTestCases.slice(0, NUMBER_EXAMPLES_TO_EVAL);

  let correct = 0;
  const total = testCases.length;

  console.log(`Running eval on ${total} test cases...\n`);

  // Create queue with concurrency and rate limiting
  const queue = new PQueue({
    concurrency: CONCURRENCY_MAX,
    interval: RATE_LIMIT_WINDOW,
    intervalCap: RATE_LIMIT_NUMBER_ALLOWED,
  });

  // Create tasks for all test cases
  const tasks = testCases.map((testCase, i) =>
    queue.add(async () => {
      try {
        const result = await propositionsToPredictedName(
          testCase,
          MODEL_TO_EVAL,
        );
        const prediction = result.name;

        // Check if the prediction matches the killer
        const isCorrect = prediction === testCase.killer;

        if (isCorrect) {
          correct++;
          console.log(`✓ Test ${i + 1}: Correct (${testCase.killer})`);
        } else {
          console.log(
            `✗ Test ${i + 1}: Wrong (expected ${testCase.killer}, got: ${prediction})`,
          );
        }

        return isCorrect;
      } catch (error) {
        console.error(`✗ Test ${i + 1}: Error - ${error}`);
        return false;
      }
    }),
  );

  // Wait for all tasks to complete
  await Promise.all(tasks);

  const accuracy = (correct / total) * 100;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Accuracy: ${correct}/${total} (${accuracy.toFixed(1)}%)`);
  console.log(`${"=".repeat(50)}`);
}

runEval().catch(console.error);
