/**
 * Submit fine-tuning jobs to OpenAI for the four datasets.
 * This script will:
 * 1. Upload each JSONL file to OpenAI
 * 2. Create a fine-tuning job for each dataset
 *
 * IMPORTANT: This script requires the OpenAI SDK to be installed:
 *   pnpm add openai
 *
 * DO NOT RUN this script unless you want to create actual fine-tuning jobs
 * that will incur costs on your OpenAI account.
 *
 * Run with: pnpm script scripts/submit-fine-tune-jobs.ts
 */

import fs from "node:fs";
import path from "node:path";

// NOTE: This will cause a type error until you install the openai package
// Run: pnpm add openai

/**
 * Dynamically import and initialize OpenAI client
 */
async function getOpenAIClient() {
  try {
    // @ts-expect-error - openai package must be installed before running this script
    const { default: OpenAI } = await import("openai");
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error("❌ Error: OpenAI package not found");
    console.error("   Please install it first: pnpm add openai");
    throw error;
  }
}

interface FineTuningJobConfig {
  filename: string;
  suffix: string;
  description: string;
}

const FINE_TUNING_CONFIGS: FineTuningJobConfig[] = [
  {
    filename: "most-confident-wrong.jsonl",
    suffix: "most-conf-wrong",
    description: "72 most confident but wrong predictions",
  },
  {
    filename: "least-confident-wrong.jsonl",
    suffix: "least-conf-wrong",
    description: "72 least confident and wrong predictions",
  },
  {
    filename: "correct.jsonl",
    suffix: "correct",
    description: "72 correct predictions",
  },
  {
    filename: "all-cases.jsonl",
    suffix: "all-cases",
    description: "All 500 test cases",
  },
];

/**
 * Upload a file to OpenAI for fine-tuning
 */
async function uploadFile(
  openai: Awaited<ReturnType<typeof getOpenAIClient>>,
  filePath: string,
): Promise<string> {
  console.log(`📤 Uploading ${path.basename(filePath)}...`);

  const file = await openai.files.create({
    file: fs.createReadStream(filePath),
    purpose: "fine-tune",
  });

  console.log(`✅ Uploaded with file ID: ${file.id}`);
  return file.id;
}

/**
 * Create a fine-tuning job
 */
async function createFineTuningJob(
  openai: Awaited<ReturnType<typeof getOpenAIClient>>,
  fileId: string,
  suffix: string,
): Promise<string> {
  console.log(`🚀 Creating fine-tuning job with suffix: ${suffix}...`);

  const fineTune = await openai.fineTuning.jobs.create({
    training_file: fileId,
    model: "gpt-4.1-nano",
    suffix: suffix,
  });

  console.log(`✅ Fine-tuning job created with ID: ${fineTune.id}`);
  return fineTune.id;
}

/**
 * Submit all fine-tuning jobs
 */
async function submitAllFineTuningJobs() {
  console.log("🎯 Starting fine-tuning job submission\n");
  console.log("=".repeat(60));

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable not set");
    console.error("   Please set it in your .env.local file");
    process.exit(1);
  }

  // Initialize OpenAI client
  const openai = await getOpenAIClient();

  const dataDir = path.join(process.cwd(), "fine-tune-data");

  // Check if data directory exists
  try {
    await fs.promises.access(dataDir);
  } catch {
    console.error(`❌ Error: Directory not found: ${dataDir}`);
    console.error(
      "   Run 'pnpm script scripts/generate-fine-tune-datasets.ts' first",
    );
    process.exit(1);
  }

  const results: Array<{
    config: FineTuningJobConfig;
    fileId: string;
    jobId: string;
  }> = [];

  // Process each dataset
  for (const config of FINE_TUNING_CONFIGS) {
    const filePath = path.join(dataDir, config.filename);

    console.log(`\n📋 Processing: ${config.description}`);
    console.log(`   File: ${config.filename}`);

    try {
      // Check if file exists
      await fs.promises.access(filePath);

      // Upload file
      const fileId = await uploadFile(openai, filePath);

      // Create fine-tuning job
      const jobId = await createFineTuningJob(openai, fileId, config.suffix);

      results.push({ config, fileId, jobId });

      console.log("✅ Job submitted successfully\n");
    } catch (error) {
      console.error(`❌ Error processing ${config.filename}:`, error);
      throw error;
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ All fine-tuning jobs submitted successfully!\n");
  console.log("📊 Summary:\n");

  for (const result of results) {
    console.log(`🔹 ${result.config.description}`);
    console.log(`   File ID: ${result.fileId}`);
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Model suffix: ${result.config.suffix}`);
    console.log("");
  }

  console.log("💡 Monitor your jobs at: https://platform.openai.com/finetune");
  console.log("💡 Or use the OpenAI CLI: openai api fine_tunes.list");
  console.log(`\n${"=".repeat(60)}`);
  console.log("\n📌 Once fine-tuning is complete, your models will be named:");

  for (const result of results) {
    console.log(`   gpt-4.1-nano:${result.config.suffix}`);
  }

  console.log("\n🎉 Done!");
}

// Main execution
if (require.main === module) {
  submitAllFineTuningJobs().catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
}

export { submitAllFineTuningJobs };
