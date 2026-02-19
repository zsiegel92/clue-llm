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
import OpenAI from "openai";
import type { BaseOpenAIModel, FineTuningJobConfig } from "@/lib/schemas";

// NOTE: This will cause a type error until you install the openai package
// Run: pnpm add openai

const outDir = path.join(process.cwd(), "out");
const outPath = path.join(outDir, "fine-tune-jobs.json");

const fineTuningModelMap: Record<BaseOpenAIModel, string> = {
  "gpt-4.1-nano": "gpt-4.1-nano-2025-04-14",
  "gpt-4.1": "gpt-4.1-2025-04-14",
  "gpt-4.1-mini": "gpt-4.1-mini-2025-04-14",
  "gpt-4o": "gpt-4o-2024-11-20",
  "gpt-4o-mini": "gpt-4o-mini-2024-07-18",
};

async function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

type OpenAIClient = Awaited<ReturnType<typeof getOpenAIClient>>;

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
  openai: OpenAIClient,
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
  openai: OpenAIClient,
  fileId: string,
  suffix: string,
): Promise<string> {
  console.log(`🚀 Creating fine-tuning job with suffix: ${suffix}...`);

  const fineTune = await openai.fineTuning.jobs.create({
    training_file: fileId,
    model: fineTuningModelMap["gpt-4.1-nano"],
    suffix: suffix,
  });

  console.log(`✅ Fine-tuning job created with ID: ${fineTune.id}`);
  return fineTune.id;
}

/**
 * Submit all fine-tuning jobs
 */
async function main() {
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

  // Write results to ./out/fine-tune-jobs.json
  await fs.promises.mkdir(outDir, { recursive: true });
  const output = results.map((r) => ({
    suffix: r.config.suffix,
    description: r.config.description,
    filename: r.config.filename,
    fileId: r.fileId,
    jobId: r.jobId,
  }));
  await fs.promises.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\n📁 Job details written to ${outPath}`);

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
  console.log(`\n${"=".repeat(60)}`);
  console.log("\n📌 Once fine-tuning is complete, your models will be named:");

  for (const result of results) {
    console.log(
      `   ${fineTuningModelMap["gpt-4.1-nano"]}:${result.config.suffix}`,
    );
  }

  console.log("\n🎉 Done!");
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
