import assert from "node:assert/strict";
import {
  hasClozeMarkup,
  isImageOcclusionSnapshot,
  normalizeFieldSnapshotToMaster,
  NORMALIZE_VERSION,
} from "./anki-normalize-to-master";
import {
  masterFieldOrder,
  buildNoteFieldValues,
  MARKER_HASH,
  PERSONAL_NOTES_FIELD,
} from "./anki-bootstrap-notetype";
import { computeCentralSyncHash } from "./anki-deck-incorporation";

{
  assert.equal(hasClozeMarkup("What is {{c1::Lachman}}?"), true);
  assert.equal(hasClozeMarkup("No cloze here"), false);
  assert.equal(
    isImageOcclusionSnapshot([{ name: "Image" }, { name: "Question Mask" }]),
    true,
  );
}

{
  const snap = [
    {
      name: "Text",
      rawValue: "Most sensitive ACL test is the {{c1::Lachman}}.",
    },
    { name: "Extra", rawValue: "Pivot shift more specific." },
    { name: "First Aid", rawValue: "<img src='fa.png'>" },
    { name: "Missed Questions", rawValue: "Missed once" },
    { name: "Personal Notes", rawValue: "private" },
    { name: "One by one", rawValue: "yes" },
  ];
  const tags = ["SnapOrtho::Knee", "personal::x", "#AK_Step1"];
  const norm = normalizeFieldSnapshotToMaster(snap, tags, 0);
  assert.equal(norm.normalizeVersion, NORMALIZE_VERSION);
  assert.equal(norm.clozeBetaEligible, true);
  assert.equal(norm.hasClozeMarkup, true);
  assert.equal(norm.isImageOcclusion, false);
  assert.match(norm.fieldSnapshot.find((f) => f.name === "Text")!.rawValue, /Lachman/);
  assert.match(norm.fieldSnapshot.find((f) => f.name === "Extra")!.rawValue, /Pivot/);
  assert.match(
    norm.fieldSnapshot.find((f) => f.name === "Additional_Resources")!.rawValue,
    /First Aid/,
  );
  assert.equal(
    norm.fieldSnapshot.find((f) => f.name === "Missed_Questions")!.rawValue,
    "Missed once",
  );
  assert.ok(!norm.fieldSnapshot.some((f) => f.name === PERSONAL_NOTES_FIELD));
  assert.ok(!norm.expandedFields.some((f) => f.name === PERSONAL_NOTES_FIELD));

  // Hash must match installed note with full master order (empty resources included).
  const order = masterFieldOrder();
  const values = buildNoteFieldValues(order, {
    fieldSnapshot: norm.fieldSnapshot,
    canonicalCardId: "a".repeat(8) + "-aaaa-4aaa-8aaa-" + "a".repeat(12),
    canonicalCardVersionId: "b".repeat(8) + "-bbbb-4bbb-8bbb-" + "b".repeat(12),
    contentHash: norm.contentHash,
  });
  const installed = computeCentralSyncHash(
    order.map((name, i) => ({ name, value: values[i] ?? "" })),
    tags,
    0,
  );
  assert.equal(installed, norm.contentHash);
  assert.equal(values[order.indexOf(MARKER_HASH)], norm.contentHash);
}

{
  const io = normalizeFieldSnapshotToMaster(
    [
      { name: "Image", rawValue: "<img src=x>" },
      { name: "Question Mask", rawValue: "..." },
    ],
    [],
    0,
  );
  assert.equal(io.clozeBetaEligible, false);
  assert.equal(io.isImageOcclusion, true);
}

{
  const noCloze = normalizeFieldSnapshotToMaster(
    [{ name: "Text", rawValue: "Just a statement." }],
    [],
    0,
  );
  assert.equal(noCloze.clozeBetaEligible, false);
  assert.equal(noCloze.hasClozeMarkup, false);
}

console.log("anki-normalize-to-master.test.ts: all assertions passed");
