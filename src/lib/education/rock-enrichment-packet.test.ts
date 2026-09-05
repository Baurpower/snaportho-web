import assert from "node:assert/strict";
import {
  MAX_CHAPTERS_PER_CARD,
  ROCK_ENRICHMENT_CONTRACT,
  ROCK_FIELD,
  ROCK_FILL_RUN_KEY,
  ROCK_LINK_FIELD,
  ROCK_MAP_RUN_KEY,
  applyRockFillSidecar,
  applyRockMapSidecar,
  buildRockHtml,
  canonicalRockChapterUrl,
  fieldsFromSnapshot,
  isBlankResource,
  isPendingPacketFileName,
  overlaysFromFillPacket,
  pendingPacketFileName,
  searchQueryForCard,
  sealFillPacket,
  sealMapPacket,
  validateBullets,
  type RockFillCard,
  type RockFillPacket,
  type RockMapCard,
  type RockMapPacket,
} from "./rock-enrichment-packet.ts";
import { buildRockIndex, catalogUrlForId } from "./rock-retrieval.ts";

assert.equal(pendingPacketFileName("map-000001-agent-01"), "rock-map-000001-agent-01-pending.json");
assert.equal(isPendingPacketFileName("rock-map-x-pending.json"), true);
assert.equal(isPendingPacketFileName("../escape-pending.json"), false);
assert.equal(ROCK_FIELD, "ROCK");
assert.equal(ROCK_LINK_FIELD, "ROCK_Link");
assert.equal(MAX_CHAPTERS_PER_CARD, 3);

assert.equal(isBlankResource(""), true);
assert.equal(isBlankResource("<div>&nbsp; </div>"), true);
assert.equal(isBlankResource("<p>content</p>"), false);

const fields = fieldsFromSnapshot([{ name: "Text", rawValue: "Q" }, { name: "ROCK", value: "" }]);
assert.equal(fields.Text, "Q");
assert.equal(fields.ROCK, "");

const q = searchQueryForCard("ACL graft choice", "hamstring vs BTB", "SnapOrtho::Sports::Knee");
assert.ok(q.includes("ACL graft choice"));
assert.ok(q.includes("Sports Knee"));
assert.ok(!q.includes("SnapOrtho"));

assert.deepEqual(canonicalRockChapterUrl("https://rock.aaos.org/coursecontent.aspx?id=6003020"), {
  ok: true,
  canonical: "https://rock.aaos.org/coursecontent.aspx?id=6003020",
});
assert.equal(canonicalRockChapterUrl("https://rock.aaos.org/coursecontent.aspx?id=6003020", "6003020").ok, true);
assert.equal(canonicalRockChapterUrl("https://rock.aaos.org/coursecontent.aspx?id=6003020", "1").ok, false);
assert.equal(canonicalRockChapterUrl("http://rock.aaos.org/coursecontent.aspx?id=6003020").ok, false);
assert.equal(canonicalRockChapterUrl("https://rock.aaos.org/coursecontent.aspx?id=6003020&foo=1").ok, false);
assert.equal(canonicalRockChapterUrl("https://www.orthobullets.com/trauma/1/foo").ok, false);
assert.equal(catalogUrlForId("6003020"), "https://rock.aaos.org/coursecontent.aspx?id=6003020");

const bulletsOk = validateBullets(
  ["Posterior wall fractures often need ORIF when the hip is unstable.", "Concentric reduction is confirmed on both AP and Judet views."],
  { front: "Which view confirms concentric reduction of an acetabular fracture?", extra: "" },
);
assert.deepEqual(bulletsOk, []);
assert.ok(validateBullets(["too short"], { front: "x", extra: "" }).includes("bullet_count:1"));
assert.ok(
  validateBullets(
    ["See https://rock.aaos.org/coursecontent.aspx?id=1 for more.", "Concentric reduction is confirmed on both AP and Judet views."],
    { front: "x", extra: "" },
  ).some((e) => e.startsWith("bullet_contains_url")),
);

const html = buildRockHtml([
  {
    id: "6003020",
    title: "Acetabular Fractures: Evaluation and Management",
    url: "https://rock.aaos.org/coursecontent.aspx?id=6003020",
    role: "primary",
    bullets: ["Posterior wall fractures often need ORIF when the hip is unstable.", "Concentric reduction is confirmed on both AP and Judet views."],
  },
  {
    id: "6002026",
    title: "Acetabular Fractures: Definitive Management and Outcomes",
    url: "https://rock.aaos.org/coursecontent.aspx?id=6002026",
    role: "secondary",
    bullets: ["Letournel classification guides both approach and implant choice for acetabular ORIF."],
    linkOnly: true,
  },
]);
assert.ok(html.includes('data-rock-id="6003020"'));
assert.ok(html.includes("Acetabular Fractures: Evaluation and Management"));
assert.ok(html.includes("Posterior wall fractures"));
assert.ok(html.includes('href="https://rock.aaos.org/coursecontent.aspx?id=6003020"'));
assert.ok(html.includes('data-rock-id="6002026"'));
assert.ok(!html.includes("Letournel classification"));
assert.ok(!html.includes("<script"));

const candidate = {
  id: "6003020",
  title: "Acetabular Fractures: Evaluation and Management",
  url: "https://rock.aaos.org/coursecontent.aspx?id=6003020",
  canonicalId: "6003020",
  extractable: true,
  score: 12,
  snippet: "acetabulum",
};
const mapCard: RockMapCard = {
  noteId: "n1",
  noteVersionId: "v1",
  stableGuid: "g1",
  contentChecksum: "c1",
  deckPath: "SnapOrtho::Trauma",
  front: "acetabular wall",
  extra: "",
  governedTags: [],
  currentRock: "",
  currentRockLink: "",
  searchQuery: "acetabular wall",
  candidates: [candidate, { ...candidate, id: "6002026", title: "Acetabular Fractures: Definitive Management and Outcomes", url: "https://rock.aaos.org/coursecontent.aspx?id=6002026", canonicalId: "6002026" }],
};
const mapPacket: RockMapPacket = sealMapPacket({
  schemaVersion: ROCK_ENRICHMENT_CONTRACT,
  runKey: ROCK_MAP_RUN_KEY,
  stage: "map",
  sourceReleaseId: "r1",
  sourceReleaseVersion: "0.0.8",
  corpusChecksum: "cc",
  batchKey: "map-b1",
  instructions: [],
  cards: [mapCard],
});
const mapped = applyRockMapSidecar(mapPacket, {
  batchKey: "map-b1",
  inputChecksum: mapPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{
    stableGuid: "g1",
    status: "mapped",
    chapters: [
      { id: "6003020", role: "primary" },
      { id: "6002026", role: "secondary" },
    ],
  }],
});
assert.equal(mapped.cards[0].enrichmentStatus, "mapped");
assert.equal(mapped.cards[0].chapters?.[0].id, "6003020");
assert.equal(mapped.cards[0].chapters?.[1].role, "secondary");

assert.throws(() => applyRockMapSidecar(mapPacket, {
  batchKey: "map-b1",
  inputChecksum: mapPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{ stableGuid: "g1", status: "mapped", chapters: [{ id: "999", role: "primary" }] }],
}), /sidecar_chapter_not_in_candidates/);

const fillCard: RockFillCard = {
  ...mapCard,
  mappedChapters: mapped.cards[0].chapters!,
  pageCandidates: [{ chapterId: "6003020", title: candidate.title, pdfPage: 2, score: 1, snippet: "s" }],
};
const fillPacket: RockFillPacket = sealFillPacket({
  schemaVersion: ROCK_ENRICHMENT_CONTRACT,
  runKey: ROCK_FILL_RUN_KEY,
  stage: "fill",
  sourceReleaseId: "r1",
  sourceReleaseVersion: "0.0.8",
  corpusChecksum: "cc",
  batchKey: "fill-b1",
  instructions: [],
  cards: [fillCard],
});
const filled = applyRockFillSidecar(fillPacket, {
  batchKey: "fill-b1",
  inputChecksum: fillPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{
    stableGuid: "g1",
    status: "filled",
    chapters: [{
      id: "6003020",
      bullets: [
        "Posterior wall fractures often need ORIF when the hip is unstable.",
        "Concentric reduction is confirmed on both AP and Judet views.",
      ],
    }],
  }],
});
assert.equal(filled.cards[0].enrichmentStatus, "filled");
assert.equal(filled.cards[0].rockLink, "https://rock.aaos.org/coursecontent.aspx?id=6003020");
assert.ok(filled.cards[0].rockHtml?.includes("Posterior wall"));

const overlays = overlaysFromFillPacket(filled);
assert.equal(overlays.length, 1);
assert.equal(overlays[0].rockLink, "https://rock.aaos.org/coursecontent.aspx?id=6003020");

assert.throws(() => applyRockFillSidecar(fillPacket, {
  batchKey: "fill-b1",
  inputChecksum: fillPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{ stableGuid: "g1", status: "filled", chapters: [{ id: "6000001", bullets: ["aaaaaaaaaaaa", "bbbbbbbbbbbb"] }] }],
}), /sidecar_chapter_not_mapped/);

const index = buildRockIndex(
  {
    chapters: [
      {
        id: "6003020",
        title: "Acetabular Fractures: Evaluation and Management",
        titleKey: "acetabular fractures evaluation and management",
        url: catalogUrlForId("6003020"),
        filename: "x.pdf",
        pages: 2,
        bytes: 1,
        extractableChars: 400,
        charsPerPage: 200,
        status: "verified",
        extractable: true,
        canonicalId: "6003020",
        aliasIds: [],
        isCanonical: true,
      },
      {
        id: "6000001",
        title: "Acute Lateral Ankle Instability",
        titleKey: "acute lateral ankle instability",
        url: catalogUrlForId("6000001"),
        filename: "y.pdf",
        pages: 2,
        bytes: 1,
        extractableChars: 400,
        charsPerPage: 200,
        status: "verified",
        extractable: true,
        canonicalId: "6000001",
        aliasIds: [],
        isCanonical: true,
      },
    ],
  },
  [
    {
      id: "6003020",
      title: "Acetabular Fractures: Evaluation and Management",
      url: catalogUrlForId("6003020"),
      pages: [
        { pdf_page: 1, text: "Acetabular fractures Letournel classification posterior wall hip dislocation.", chars: 80 },
        { pdf_page: 2, text: "Judet views confirm concentric reduction of the acetabulum after reduction.", chars: 80 },
      ],
    },
    {
      id: "6000001",
      title: "Acute Lateral Ankle Instability",
      url: catalogUrlForId("6000001"),
      pages: [
        { pdf_page: 1, text: "The anterior talofibular ligament is the most commonly injured ankle ligament.", chars: 80 },
      ],
    },
  ],
);
const chapters = index.retrieveChapters("acetabular posterior wall Judet", 2);
assert.equal(chapters[0].id, "6003020");
const pages = index.retrievePages("6003020", "Judet concentric reduction", 1);
assert.equal(pages[0].pdfPage, 2);

console.log("rock-enrichment-packet.test.ts OK");
