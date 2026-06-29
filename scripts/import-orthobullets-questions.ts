import {
  applyOrthobulletsImport,
  parseArgs,
  writeArtifacts,
} from "./lib/education/orthobullets-import.ts";

async function main() {
  const { dryRun, seedTopicConcepts, inputPath, outDir } = parseArgs(process.argv);
  const artifacts = await applyOrthobulletsImport(inputPath, {
    dryRun,
    seedTopicConcepts,
  });
  const output = writeArtifacts(outDir, artifacts);

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        seedTopicConcepts,
        inputPath,
        outDir,
        reviewCsvPath: output.reviewCsvPath,
        topicReviewCsvPath: output.topicReviewCsvPath,
        conceptTaskCsvPath: output.conceptTaskCsvPath,
        sourceAnomaliesCsvPath: output.sourceAnomaliesCsvPath,
        potentialDuplicatesCsvPath: output.potentialDuplicatesCsvPath,
        summaryJsonPath: output.summaryJsonPath,
        summaryMdPath: output.summaryMdPath,
        summary: artifacts.summary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(
      JSON.stringify(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...Object.fromEntries(
            Object.getOwnPropertyNames(error)
              .filter((key) => !["name", "message", "stack"].includes(key))
              .map((key) => [key, (error as unknown as Record<string, unknown>)[key]])
          ),
        },
        null,
        2
      )
    );
  } else {
    console.error(JSON.stringify({ error }, null, 2));
  }
  process.exit(1);
});
