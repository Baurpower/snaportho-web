import { importAnkiFile } from "./lib/education/anki-import/upsert-anki-import.ts";

type ParsedArgs = {
  dryRun: boolean;
  filePath: string;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const extra = Object.fromEntries(
      Object.getOwnPropertyNames(error)
        .filter((key) => !["name", "message", "stack"].includes(key))
        .map((key) => [key, (error as unknown as Record<string, unknown>)[key]])
    );

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...extra,
    };
  }

  if (error && typeof error === "object") {
    return Object.fromEntries(
      Object.entries(error).map(([key, value]) => [key, value])
    );
  }

  return { error: String(error) };
}

function parseArgs(argv: string[]): ParsedArgs {
  let dryRun = false;
  let filePath = "";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--apply") {
      dryRun = false;
      continue;
    }

    if (arg === "--file") {
      filePath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
  }

  if (!filePath) {
    throw new Error("Missing required --file /path/to/deck.apkg|export.tsv");
  }

  return { dryRun, filePath };
}

async function main() {
  const { dryRun, filePath } = parseArgs(process.argv);
  const summary = await importAnkiFile(filePath, { dryRun });

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        filePath,
        importBatchId: summary.importBatchId,
        decks: summary.deckCount,
        models: summary.modelCount,
        notes: summary.noteCount,
        cards: summary.cardCount,
        tags: summary.tagCount,
        mediaRefs: summary.mediaRefCount,
        canonicalCardsCreated: summary.canonicalCardCount,
        qualityReviewRowsCreated: summary.qualityReviewCount,
        warnings: summary.warnings,
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
