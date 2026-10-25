/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This script evaluates the configured photo classifier against labeled images. It reports classification accuracy and related results for the supplied evaluation dataset.
 */

/**
 * Accuracy evaluation for the photo classifier.
 *
 *   1. Put labeled photos in eval/images/ and list them in eval/labels.csv
 *   2. Set ANTHROPIC_API_KEY and AI_MODEL in .env.local
 *   3. npm run eval
 *
 * Writes eval/RESULTS.md. Put the headline numbers in your README.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { classifyReport } from "../lib/classify";
import { applySafetyRules } from "../lib/safety";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

interface Row {
  filename: string;
  trueCategory: string;
  trueSeverity: string;
}

function readLabels(file: string): Row[] {
  const rows: Row[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("filename,")) continue;
    const [filename, trueCategory, trueSeverity] = t.split(",").map((s) => s.trim());
    if (filename && trueCategory && trueSeverity) rows.push({ filename, trueCategory, trueSeverity });
  }
  return rows;
}

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function main() {
  const root = path.resolve(__dirname, "..");
  loadEnvFile(path.join(root, ".env.local"));

  if (!process.env.ANTHROPIC_API_KEY || !process.env.AI_MODEL) {
    if (process.env.EVAL_ALLOW_MOCK !== "1") {
      console.error(
        "No model configured. The mock classifier ignores photos, so its accuracy is meaningless.\n" +
          "Set ANTHROPIC_API_KEY and AI_MODEL in .env.local (or set EVAL_ALLOW_MOCK=1 to test this script itself).",
      );
      process.exit(1);
    }
  }

  const rows = readLabels(path.join(root, "eval", "labels.csv"));
  if (rows.length === 0) {
    console.error("eval/labels.csv has no data rows yet. Add labeled photos first.");
    process.exit(1);
  }

  let total = 0;
  let catCorrect = 0;
  let sevCorrect = 0;
  let sevWithinOne = 0;
  let abstained = 0;
  let abstainedWrong = 0;
  let fallbacks = 0;
  let promptTokens = 0;
  let outputTokens = 0;
  let tokenCalls = 0;
  const misses: string[] = [];
  const rank = { minor: 0, standard: 1, urgent: 2, emergency: 3 } as Record<string, number>;

  for (const row of rows) {
    const file = path.join(root, "eval", "images", row.filename);
    if (!existsSync(file)) {
      console.warn(`Skipping missing file: ${row.filename}`);
      continue;
    }
    const mime = MIME[path.extname(file).toLowerCase()] ?? "image/jpeg";
    const result = await classifyReport({
      imageBase64: readFileSync(file).toString("base64"),
      mimeType: mime,
      description: "",
    });
    total += 1;
    if (result.provider === "fallback") fallbacks += 1;
    if (result.usage) {
      promptTokens += result.usage.promptTokens;
      outputTokens += result.usage.outputTokens;
      tokenCalls += 1;
    }

    const safety = applySafetyRules(result.classification);
    const predCategory = safety.ok ? safety.classification.category : "not_housing";
    const predSeverity = safety.ok ? safety.classification.severity : "minor";
    const needsReview = safety.ok ? safety.needsReview : false;

    const catOk = predCategory === row.trueCategory;
    if (catOk) catCorrect += 1;
    if (predSeverity === row.trueSeverity) sevCorrect += 1;
    if (Math.abs(rank[predSeverity] - rank[row.trueSeverity]) <= 1) sevWithinOne += 1;
    if (needsReview) {
      abstained += 1;
      if (!catOk) abstainedWrong += 1;
    }
    if (!catOk) misses.push(`${row.filename}: true=${row.trueCategory}, predicted=${predCategory}`);
    console.log(`${catOk ? "ok  " : "MISS"} ${row.filename} -> ${predCategory}/${predSeverity}`);
  }

  const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);
  const lines = [
    "# Classifier evaluation",
    "",
    `Model: \`${process.env.AI_MODEL ?? "mock"}\`. Photos evaluated: ${total}.`,
    "",
    "| Metric | Result |",
    "| --- | --- |",
    `| Category accuracy | ${pct(catCorrect, total)} (${catCorrect}/${total}) |`,
    `| Priority exact match | ${pct(sevCorrect, total)} |`,
    `| Priority within one level | ${pct(sevWithinOne, total)} |`,
    `| Sent to human review (low confidence) | ${pct(abstained, total)} |`,
    `| Wrong answers caught by low-confidence review | ${pct(abstainedWrong, total - catCorrect)} of misses |`,
    `| API failures (manual fallback used) | ${fallbacks} |`,
    "",
  ];
  if (tokenCalls > 0) {
    const avgIn = promptTokens / tokenCalls;
    const avgOut = outputTokens / tokenCalls;
    lines.push(
      "## Cost per report",
      "",
      `Average tokens per classification: ${avgIn.toFixed(0)} in, ${avgOut.toFixed(0)} out.`,
    );
    const pin = Number(process.env.EVAL_PRICE_IN_PER_M);
    const pout = Number(process.env.EVAL_PRICE_OUT_PER_M);
    if (pin >= 0 && pout >= 0 && process.env.EVAL_PRICE_IN_PER_M) {
      const cost = (avgIn * pin + avgOut * pout) / 1_000_000;
      lines.push(`At the prices you supplied, that is about $${cost.toFixed(5)} per report.`);
    } else {
      lines.push(
        "Set EVAL_PRICE_IN_PER_M and EVAL_PRICE_OUT_PER_M (dollars per million tokens, from your provider's pricing page) to compute dollars.",
      );
    }
    lines.push("");
  }
  if (misses.length) lines.push("## Misses", "", ...misses.map((m) => `- ${m}`), "");

  writeFileSync(path.join(root, "eval", "RESULTS.md"), lines.join("\n"));
  console.log("\n" + lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
