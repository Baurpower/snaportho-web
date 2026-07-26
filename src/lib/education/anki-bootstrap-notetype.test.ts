import assert from "node:assert/strict";
import {
  ankiFieldChecksum,
  buildMarkerValues,
  buildMasterNoteTypeSpec,
  buildNoteFieldValues,
  centralHashFromOrderedFields,
  deriveMasterFieldOrder,
  expandDeckHierarchy,
  formatAnkiTags,
  MARKER_HASH,
  MARKER_ID,
  MARKER_VERSION,
  masterFieldOrder,
  PERSONAL_NOTES_FIELD,
  SNAPORTHO_MASTER_FIELD_ORDER,
  SNAPORTHO_MASTER_NOTE_TYPE,
  SNAPORTHO_STYLE_VERSION,
  validateBootstrapCards,
} from "./anki-bootstrap-notetype";
import { computeCentralSyncHash } from "./anki-deck-incorporation";

const id = (x: string) =>
  `${x.repeat(8)}-${x.repeat(4)}-4${x.repeat(3)}-8${x.repeat(3)}-${x.repeat(12)}`;

// Frozen parity vector from anki-deck-incorporation.test.ts / test_reviewer.py
const PARITY_CENTRAL_HASH =
  "9495123b73dc2f69148fa64ac0a20515a0086c2e34d4a34326f5eac978e074f5";

{
  // Locked ultimate field order ignores snapshot-derived names.
  const order = deriveMasterFieldOrder([
    {
      fieldSnapshot: [
        { name: "Back" },
        { name: "Front" },
        { name: "Personal_Notes" },
        { name: "SnapOrtho_ID" },
        { name: "Extra" },
        { name: "user_private" },
      ],
    },
    { fieldSnapshot: [{ name: "Front" }, { name: "Zulu" }] },
  ]);
  assert.deepEqual(order, [...SNAPORTHO_MASTER_FIELD_ORDER]);
  assert.deepEqual(masterFieldOrder(), [...SNAPORTHO_MASTER_FIELD_ORDER]);
  assert.equal(order[0], "Text");
  assert.equal(order.at(-1), MARKER_HASH);
  assert.equal(order.at(-4), PERSONAL_NOTES_FIELD);
  assert.ok(order.includes("Orthobullets"));
  assert.ok(order.includes("Orthobullets_Link"));
  assert.ok(order.includes("ROCK"));
  assert.ok(order.includes("Nailed_It"));
  assert.ok(order.includes("Video"));
  assert.ok(order.includes("Millers"));
}

{
  const card = {
    canonicalCardId: id("a"),
    canonicalCardVersionId: id("b"),
    contentHash: "c".repeat(64),
    fieldSnapshot: [
      { name: "Text", rawValue: "The {{c1::ACL}} is tested how?" },
      { name: "Extra", value: "Lachman most sensitive" },
      { name: "Orthobullets", rawValue: "<ul><li>Primary restraint to anterior translation</li></ul>" },
      { name: "Orthobullets_Link", rawValue: "https://www.orthobullets.com/sports/3009/acl-tear" },
      { name: "Personal_Notes", rawValue: "should never ship" },
      { name: "SnapOrtho_ID", rawValue: "stale" },
    ],
  };
  const order = masterFieldOrder();
  const values = buildNoteFieldValues(order, card);
  const byName = Object.fromEntries(order.map((n, i) => [n, values[i]]));
  assert.equal(byName.Text, "The {{c1::ACL}} is tested how?");
  assert.equal(byName.Extra, "Lachman most sensitive");
  assert.equal(byName.Orthobullets_Link, "https://www.orthobullets.com/sports/3009/acl-tear");
  assert.equal(byName.ROCK, "");
  assert.equal(byName[PERSONAL_NOTES_FIELD], "");
  assert.equal(byName[MARKER_ID], id("a"));
  assert.equal(byName[MARKER_VERSION], id("b"));
  assert.equal(byName[MARKER_HASH], "c".repeat(64));
  assert.deepEqual(buildMarkerValues(card), {
    [MARKER_ID]: id("a"),
    [MARKER_VERSION]: id("b"),
    [MARKER_HASH]: "c".repeat(64),
  });
}

{
  // Markers + personal must not change the central-sync hash (frozen vector).
  const fields = [
    { name: "Front", value: "What is the ≥ threshold?" },
    { name: "Back", value: "µ value" },
    { name: "Personal_Notes", value: "mine" },
    { name: MARKER_ID, value: "abc" },
  ];
  const tags = ["SnapOrtho::Foot", "SnapOrtho::Ankle", "personal::fav", "marked"];
  assert.equal(computeCentralSyncHash(fields, tags, 2), PARITY_CENTRAL_HASH);

  // When only Front/Back are present on a note value array in master order, empty Text/Extra
  // still hash as empty — use explicit Front/Back order for frozen parity of ordered-field helper.
  const order = ["Front", "Back", PERSONAL_NOTES_FIELD, MARKER_ID, MARKER_VERSION, MARKER_HASH];
  const values = buildNoteFieldValues(order, {
    fieldSnapshot: fields,
    canonicalCardId: id("1"),
    canonicalCardVersionId: id("2"),
    contentHash: PARITY_CENTRAL_HASH,
  });
  assert.equal(
    centralHashFromOrderedFields(order, values, tags, 2),
    PARITY_CENTRAL_HASH,
  );
}

{
  const order = masterFieldOrder();
  const spec = buildMasterNoteTypeSpec(order);
  assert.equal(spec.name, SNAPORTHO_MASTER_NOTE_TYPE);
  assert.equal(spec.type, 1);
  assert.equal(spec.styleVersion, SNAPORTHO_STYLE_VERSION);
  assert.equal(spec.fields.length, order.length);
  assert.equal(spec.templates.length, 1);
  assert.equal(spec.templates[0]!.name, "Cloze");
  assert.match(spec.templates[0]!.qfmt, /cloze:Text/);
  assert.match(spec.templates[0]!.afmt, /Orthobullets/);
  assert.match(spec.templates[0]!.afmt, /ROCK/);
  assert.match(spec.templates[0]!.afmt, /Nailed_It/);
  assert.match(spec.templates[0]!.afmt, /Video/);
  assert.match(spec.templates[0]!.afmt, /Millers/);
  assert.match(spec.css, /SnapOrtho Master card style/);
  assert.doesNotMatch(spec.templates[0]!.qfmt, /SnapOrtho_ID/);
  assert.doesNotMatch(spec.templates[0]!.afmt, /SnapOrtho_Installed_Hash/);
  // Personal notes may appear on back when filled; markers must not.
  assert.match(spec.templates[0]!.afmt, /Personal_Notes/);
}

{
  assert.equal(formatAnkiTags(["SnapOrtho::B", "SnapOrtho::A", "personal"]), " SnapOrtho::A SnapOrtho::B ");
  assert.equal(formatAnkiTags([]), "");
  assert.deepEqual(expandDeckHierarchy(["SnapOrtho::Foot::Ankle", "SnapOrtho::Hand"]), [
    "SnapOrtho",
    "SnapOrtho::Foot",
    "SnapOrtho::Foot::Ankle",
    "SnapOrtho::Hand",
  ]);
  assert.equal(typeof ankiFieldChecksum("hello"), "number");
  assert.ok(ankiFieldChecksum("hello") > 0);
}

{
  const base = {
    canonicalCardId: id("1"),
    canonicalCardVersionId: id("2"),
    contentHash: "a".repeat(64),
    noteGuid: "guid-1",
    cardOrdinal: 0,
    deckPath: "SnapOrtho::Foot",
    orderingKey: "0001",
    fieldSnapshot: [{ name: "Text", rawValue: "The {{c1::talus}} is…" }],
    centralTags: ["SnapOrtho::Foot"],
  };
  assert.deepEqual(validateBootstrapCards([base]), []);
  assert.ok(
    validateBootstrapCards([{ ...base, cardOrdinal: 1 }]).some((e) =>
      e.startsWith("multi_ordinal_unsupported"),
    ),
  );
  // Non-SnapOrtho import paths are valid for bootstrap pilots
  assert.deepEqual(validateBootstrapCards([{ ...base, deckPath: "Other::Deck" }]), []);
  assert.ok(
    validateBootstrapCards([{ ...base, deckPath: "" }]).some((e) =>
      e.startsWith("invalid_deck_path"),
    ),
  );
}

console.log("anki-bootstrap-notetype.test.ts: all assertions passed");
