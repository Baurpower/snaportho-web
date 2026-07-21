import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseCsv, parseRequiredBoolean } from "./lib/education/review-csv.ts";

const DEFAULT_INPUT = "reports/educational-content-layer/anki-launch-foundation/patellar-instability-review/recommendation-review.csv";
const LABELS = new Set(["highly_relevant", "acceptable", "weak", "incorrect", "duplicate_redundant"]);
const RELEVANT = new Set(["highly_relevant", "acceptable"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pct(part: number, whole: number) {
  return whole ? Number(((part / whole) * 100).toFixed(1)) : 0;
}

function requireHeaders(rows: Array<Record<string, string>>, headers: string[]) {
  if (!rows.length) throw new Error("Reviewer packet is empty");
  const present = new Set(Object.keys(rows[0]));
  const missing = headers.filter((header) => !present.has(header));
  if (missing.length) throw new Error(`Reviewer packet is missing columns: ${missing.join(", ")}`);
}

function main() {
  const inputArg = process.argv.find((value) => value.startsWith("--input="));
  const outArg = process.argv.find((value) => value.startsWith("--out="));
  const inputPath = path.resolve(inputArg?.slice(8) || DEFAULT_INPUT);
  const outPath = path.resolve(outArg?.slice(6) || path.join(path.dirname(inputPath), "recommendation-review-metrics.json"));
  if (!existsSync(inputPath)) throw new Error(`Reviewer packet not found: ${inputPath}`);
  const rows = parseCsv(readFileSync(inputPath, "utf8"));
  requireHeaders(rows, ["sourceQuestionId", "rank", "canonicalCardId", "relevanceLabel", "mappingError", "missingObviousCard", "reviewerUserId", "reviewedAt"]);

  const byQuestion = new Map<string, Array<Record<string, string>>>();
  for (const row of rows) {
    const bucket = byQuestion.get(row.sourceQuestionId) ?? [];
    bucket.push(row);
    byQuestion.set(row.sourceQuestionId, bucket);
  }
  const errors: string[] = [];
  let relevantAt1 = 0;
  let relevantRecommendations = 0;
  let realRecommendations = 0;
  let duplicateRecommendations = 0;
  let mappingErrors = 0;
  let noResultQuestions = 0;
  let fewerThanThreeQuestions = 0;
  let missingObviousQuestions = 0;
  let suitableQuestions = 0;

  for (const [questionId, questionRows] of byQuestion) {
    questionRows.sort((a, b) => Number(a.rank) - Number(b.rank));
    const ranks = questionRows.map((row) => Number(row.rank));
    if (new Set(ranks).size !== ranks.length || ranks.some((rank) => !Number.isInteger(rank) || rank < 1 || rank > 3)) {
      errors.push(`${questionId}: ranks must be unique integers 1-3`);
    }
    const real = questionRows.filter((row) => row.canonicalCardId.trim().length > 0);
    if (!real.length) noResultQuestions += 1;
    if (real.length < 3) fewerThanThreeQuestions += 1;

    const missingFlags: boolean[] = [];
    for (const row of questionRows) {
      try {
        missingFlags.push(parseRequiredBoolean(row.missingObviousCard, `${questionId} rank ${row.rank} missingObviousCard`));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
      if (!row.canonicalCardId.trim()) continue;
      realRecommendations += 1;
      if (!LABELS.has(row.relevanceLabel)) errors.push(`${questionId} rank ${row.rank}: incomplete/invalid relevanceLabel`);
      if (!UUID.test(row.reviewerUserId)) errors.push(`${questionId} rank ${row.rank}: reviewerUserId must be a UUID`);
      if (!row.reviewedAt || Number.isNaN(Date.parse(row.reviewedAt))) errors.push(`${questionId} rank ${row.rank}: reviewedAt must be an ISO timestamp`);
      try {
        if (parseRequiredBoolean(row.mappingError, `${questionId} rank ${row.rank} mappingError`)) mappingErrors += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
      if (RELEVANT.has(row.relevanceLabel)) relevantRecommendations += 1;
      if (row.relevanceLabel === "duplicate_redundant") duplicateRecommendations += 1;
    }
    const uniqueMissingFlags = new Set(missingFlags);
    if (uniqueMissingFlags.size > 1) errors.push(`${questionId}: missingObviousCard must be consistent across all ranks`);
    const missingObvious = missingFlags[0] ?? false;
    if (missingObvious) missingObviousQuestions += 1;

    const rankOne = real.find((row) => Number(row.rank) === 1);
    if (rankOne && RELEVANT.has(rankOne.relevanceLabel)) relevantAt1 += 1;
    const relevantCount = real.filter((row) => RELEVANT.has(row.relevanceLabel)).length;
    const hasIncorrect = real.some((row) => row.relevanceLabel === "incorrect");
    if (rankOne && RELEVANT.has(rankOne.relevanceLabel) && relevantCount >= 2 && !hasIncorrect && !missingObvious) suitableQuestions += 1;
  }

  if (byQuestion.size !== 30) errors.push(`Expected 30 questions; found ${byQuestion.size}`);
  if (errors.length) {
    throw new Error(`Reviewer packet is incomplete or invalid (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n- ${errors.join("\n- ")}`);
  }

  const questionCount = byQuestion.size;
  const result = {
    generatedAt: new Date().toISOString(),
    inputPath,
    complete: true,
    questionCount,
    recommendationCount: realRecommendations,
    precisionAt1Pct: pct(relevantAt1, questionCount),
    precisionAt3Pct: pct(relevantRecommendations, questionCount * 3),
    precisionAmongReturnedPct: pct(relevantRecommendations, realRecommendations),
    suitableQuestionPct: pct(suitableQuestions, questionCount),
    mappingErrorRatePct: pct(mappingErrors, realRecommendations),
    duplicateRedundantRatePct: pct(duplicateRecommendations, realRecommendations),
    missingObviousCardRatePct: pct(missingObviousQuestions, questionCount),
    noResultRatePct: pct(noResultQuestions, questionCount),
    fewerThanThreeRatePct: pct(fewerThanThreeQuestions, questionCount),
  };
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
