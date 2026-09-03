import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { buildBootstrapApkg } from "./build-apkg.ts";
import {
  buildNoteFieldValues,
  MARKER_HASH,
  MARKER_ID,
  MARKER_VERSION,
  masterFieldOrder,
  PERSONAL_NOTES_FIELD,
  SNAPORTHO_MASTER_NOTE_TYPE,
} from "../../../../src/lib/education/anki-bootstrap-notetype.ts";
import { computeCentralSyncHash } from "../../../../src/lib/education/anki-deck-incorporation.ts";

/** contentHash must match the full installed note (all master fields, empties included). */
function contentHashForCard(
  fieldSnapshot: Array<{ name: string; rawValue?: string; value?: string }>,
  tags: string[],
  ordinal: number,
  ids: { canonicalCardId: string; canonicalCardVersionId: string },
): string {
  const order = masterFieldOrder();
  const values = buildNoteFieldValues(order, {
    fieldSnapshot,
    canonicalCardId: ids.canonicalCardId,
    canonicalCardVersionId: ids.canonicalCardVersionId,
    contentHash: "0".repeat(64),
  });
  return computeCentralSyncHash(
    order.map((name, i) => ({ name, value: values[i] ?? "" })),
    tags,
    ordinal,
  );
}

const id = (x: string) =>
  `${x.repeat(8)}-${x.repeat(4)}-4${x.repeat(3)}-8${x.repeat(3)}-${x.repeat(12)}`;

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function openApkg(apkgBytes: Buffer) {
  const dir = mkdtempSync(join(tmpdir(), "snaportho-apkg-verify-"));
  const apkgPath = join(dir, "pack.apkg");
  writeFileSync(apkgPath, apkgBytes);
  execFileSync("unzip", ["-o", apkgPath, "-d", dir], { stdio: "ignore" });
  const media = JSON.parse(readFileSync(join(dir, "media"), "utf8")) as Record<
    string,
    string
  >;
  const db = new DatabaseSync(join(dir, "collection.anki2"), {
    readonly: true,
    open: true,
  });
  return {
    dir,
    db,
    media,
    cleanup() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const pngHash = sha256(pngBytes);

const cardA = {
  canonicalCardId: id("a"),
  canonicalCardVersionId: id("b"),
  noteGuid: "guid-aaa",
  cardOrdinal: 0 as const,
  deckPath: "Marty McFlyin's Ortho Deck::Foot",
  orderingKey: "0001/guid-aaa",
  inclusionStatus: "included",
  fieldSnapshot: [
    { name: "Text", rawValue: "What is the {{c1::≥ threshold}}?" },
    { name: "Extra", rawValue: 'Answer with <img src="dot.png">' },
    { name: "Orthobullets", rawValue: "<ul><li>Curated bullet</li></ul>" },
    { name: "Orthobullets_Link", rawValue: "https://www.orthobullets.com/example" },
    { name: "Personal_Notes", rawValue: "local only" },
  ],
  centralTags: ["SnapOrtho::Foot", "SnapOrtho::Ankle"],
  mediaHashes: [pngHash],
  contentHash: "", // filled below
};
cardA.contentHash = contentHashForCard(
  cardA.fieldSnapshot,
  cardA.centralTags,
  cardA.cardOrdinal,
  {
    canonicalCardId: cardA.canonicalCardId,
    canonicalCardVersionId: cardA.canonicalCardVersionId,
  },
);

const cardB = {
  canonicalCardId: id("c"),
  canonicalCardVersionId: id("d"),
  noteGuid: "guid-bbb",
  cardOrdinal: 0 as const,
  deckPath: "Marty McFlyin Ortho Decks::Hand",
  orderingKey: "0002/guid-bbb",
  inclusionStatus: "included",
  fieldSnapshot: [
    { name: "Text", rawValue: "Hand {{c1::question}}" },
    { name: "Extra", rawValue: "µ value" },
  ],
  centralTags: ["SnapOrtho::Hand", "LegacyLooseTag"],
  mediaHashes: [] as string[],
  contentHash: "",
};
cardB.contentHash = contentHashForCard(
  cardB.fieldSnapshot,
  cardB.centralTags,
  cardB.cardOrdinal,
  {
    canonicalCardId: cardB.canonicalCardId,
    canonicalCardVersionId: cardB.canonicalCardVersionId,
  },
);

const input = {
  release: {
    id: id("e"),
    releaseKey: "snaportho-master",
    releaseVersion: "0.0.1-test",
    manifestChecksum: "f".repeat(64),
  },
  cards: [cardA, cardB],
  media: [
    {
      contentSha256: pngHash,
      logicalFilename: "dot.png",
      bytes: pngBytes,
    },
  ],
  modSeconds: 1_700_000_000,
};

{
  const first = buildBootstrapApkg(input);
  const second = buildBootstrapApkg(input);
  assert.equal(first.artifactChecksum, second.artifactChecksum);
  assert.equal(first.noteCount, 2);
  assert.equal(first.cardCount, 2);
  assert.equal(first.mediaCount, 1);
  assert.ok(first.fieldOrder.includes("Text"));
  assert.ok(first.fieldOrder.includes("Orthobullets"));
  assert.ok(first.fieldOrder.includes(MARKER_ID));
  assert.equal(first.fieldOrder.at(-1), MARKER_HASH);
  assert.equal(first.fieldOrder.at(-4), PERSONAL_NOTES_FIELD);

  const opened = openApkg(first.apkgBytes);
  try {
    const col = opened.db.prepare("select models, decks from col where id=1").get() as {
      models: string;
      decks: string;
    };
    const models = JSON.parse(col.models) as Record<
      string,
      { name: string; type: number; flds: Array<{ name: string }>; tmpls: Array<{ name: string; qfmt: string }> }
    >;
    const decks = JSON.parse(col.decks) as Record<string, { name: string }>;
    const deckNames = Object.values(decks).map((d) => d.name);
    assert.deepEqual(deckNames.sort(), ["Default", "SnapOrtho"]);
    const assignments = opened.db.prepare("select distinct did from cards").all() as Array<{did:number}>;
    assert.equal(assignments.length, 1);
    assert.equal(decks[String(assignments[0].did)].name, "SnapOrtho");
    assert.ok(!deckNames.some((n) => n.includes("Marty McFlyin")));
    const model = Object.values(models)[0]!;
    assert.equal(model.name, SNAPORTHO_MASTER_NOTE_TYPE);
    assert.equal(model.type, 1);
    assert.equal(model.tmpls[0]!.name, "Cloze");
    assert.match(model.tmpls[0]!.qfmt, /cloze:Text/);
    const fieldNames = model.flds.map((f) => f.name);
    assert.deepEqual(fieldNames, first.fieldOrder);

    const notes = opened.db
      .prepare("select guid, tags, flds from notes order by guid")
      .all() as Array<{ guid: string; tags: string; flds: string }>;
    assert.equal(notes.length, 2);

    const byGuid = new Map(notes.map((n) => [n.guid, n]));
    const noteA = byGuid.get("guid-aaa")!;
    const valuesA = noteA.flds.split("\u001f");
    const mapA = Object.fromEntries(fieldNames.map((n, i) => [n, valuesA[i] ?? ""]));
    assert.equal(mapA.Text, "What is the {{c1::≥ threshold}}?");
    assert.equal(mapA.Orthobullets_Link, "https://www.orthobullets.com/example");
    assert.equal(mapA[PERSONAL_NOTES_FIELD], "");
    assert.equal(mapA[MARKER_ID], id("a"));
    assert.equal(mapA[MARKER_VERSION], id("b"));
    assert.equal(mapA[MARKER_HASH], cardA.contentHash);
    assert.match(noteA.tags, /SnapOrtho::Ankle/);
    assert.match(noteA.tags, /SnapOrtho::Foot/);
    assert.ok(notes.every(n => n.tags.trim().split(/\s+/).filter(Boolean).every(t => t.startsWith("SnapOrtho::"))));

    // Central-sync hash of installed fields must equal marker hash / contentHash
    const recomputed = computeCentralSyncHash(
      fieldNames.map((name, i) => ({ name, value: valuesA[i] ?? "" })),
      noteA.tags.trim().split(/\s+/).filter(Boolean),
      0,
    );
    assert.equal(recomputed, cardA.contentHash);
    assert.equal(mapA[MARKER_HASH], recomputed);

    const noteB = byGuid.get("guid-bbb")!;
    const valuesB = noteB.flds.split("\u001f");
    const mapB = Object.fromEntries(fieldNames.map((n, i) => [n, valuesB[i] ?? ""]));
    assert.equal(mapB.Extra, "µ value");
    assert.equal(mapB[MARKER_ID], id("c"));

    const cards = opened.db.prepare("select count(*) as n from cards").get() as { n: number };
    assert.equal(cards.n, 2);
    // col.tags must be JSON object {} — empty string breaks Anki 26 import
    const colTags = opened.db.prepare("select tags from col where id=1").get() as { tags: string };
    assert.equal(colTags.tags, "{}");
    assert.deepEqual(JSON.parse(colTags.tags), {});

    assert.equal(Object.values(opened.media).includes("dot.png"), true);
    const mediaEntry = Object.entries(opened.media).find(([, name]) => name === "dot.png")!;
    const mediaBytes = readFileSync(join(opened.dir, mediaEntry[0]));
    assert.equal(sha256(mediaBytes), pngHash);
  } finally {
    opened.cleanup();
  }
}

{
  // Excluded cards are skipped; multi-ordinal fails
  assert.throws(
    () =>
      buildBootstrapApkg({
        ...input,
        cards: [{ ...cardA, cardOrdinal: 1 as unknown as 0 }],
      }),
    /multi_ordinal_unsupported/,
  );
  const onlyExcluded = buildBootstrapApkg({
    ...input,
    cards: [
      { ...cardA, inclusionStatus: "excluded" },
      { ...cardB, inclusionStatus: "included" },
    ],
  });
  assert.equal(onlyExcluded.noteCount, 1);
}

{
  assert.throws(
    () =>
      buildBootstrapApkg({
        ...input,
        media: [],
      }),
    /missing_media_bytes/,
  );
}

console.log("build-apkg.test.ts: all assertions passed");
