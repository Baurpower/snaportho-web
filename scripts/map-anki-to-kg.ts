import { runAnkiKgMapping } from "./lib/education/anki-kg-mapper.ts";

type ParsedArgs = {
  batchId: string;
  dryRun: boolean;
  apply: boolean;
  limit: number | null;
  deckPrefix: string | null;
  minConfidence: number;
  outDir: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let batchId = "";
  let dryRun = true;
  let apply = false;
  let limit: number | null = null;
  let deckPrefix: string | null = null;
  let minConfidence = 0.9;
  let outDir = "reports";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--batch-id") {
      batchId = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      apply = false;
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      dryRun = false;
      continue;
    }
    if (arg === "--limit") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      limit = Number.isFinite(parsed) ? parsed : null;
      index += 1;
      continue;
    }
    if (arg === "--deck-prefix") {
      deckPrefix = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--min-confidence") {
      const parsed = Number.parseFloat(argv[index + 1] ?? "");
      minConfidence = Number.isFinite(parsed) ? parsed : minConfidence;
      index += 1;
      continue;
    }
    if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    }
  }

  if (!batchId) {
    throw new Error("Missing required --batch-id");
  }

  return {
    batchId,
    dryRun,
    apply,
    limit,
    deckPrefix,
    minConfidence,
    outDir,
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...Object.fromEntries(
        Object.getOwnPropertyNames(error)
          .filter((key) => !["name", "message", "stack"].includes(key))
          .map((key) => [key, (error as unknown as Record<string, unknown>)[key]])
      ),
    };
  }

  return { error: String(error) };
}

async function main() {
  const args = parseArgs(process.argv);
  const result = await runAnkiKgMapping(args);

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        batchId: args.batchId,
        runId: result.runId,
        limit: args.limit,
        deckPrefix: args.deckPrefix,
        minConfidence: args.minConfidence,
        summary: result.summary,
        dryRunReportPath: result.dryRunReportPath,
        applyReportPath: result.applyReportPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify(serializeError(error), null, 2));
  process.exit(1);
});
