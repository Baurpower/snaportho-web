import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyEpisode,
  canonicalNailedItUrl,
  episodeIdFor,
  joinCatalog,
  parseRss,
  parseWpCategories,
  parseWpPosts,
  stripBoilerplate,
} from "./nailed-it-index.ts";
import { buildNailedItIndex } from "./nailed-it-retrieval.ts";
import {
  MAX_EPISODES_PER_CARD,
  NAILED_IT_ENRICHMENT_CONTRACT,
  NAILED_IT_FIELD,
  NAILED_IT_FILL_RUN_KEY,
  NAILED_IT_LINK_FIELD,
  NAILED_IT_MAP_RUN_KEY,
  applyNailedItFillSidecar,
  applyNailedItMapSidecar,
  buildNailedItHtml,
  decideNailedItFill,
  decideNailedItMap,
  eponymHits,
  fieldsFromSnapshot,
  formatTimestamp,
  isBlankResource,
  isPendingPacketFileName,
  overlaysFromFillPacket,
  pendingPacketFileName,
  searchQueryForCard,
  sealFillPacket,
  sealMapPacket,
  validateBullets,
  type NailedItFillCard,
  type NailedItFillPacket,
  type NailedItMapCard,
  type NailedItMapPacket,
} from "./nailed-it-enrichment-packet.ts";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/nailed-it");
const rss = parseRss(readFileSync(path.join(fixtureDir, "rss.xml"), "utf8"));
const posts = parseWpPosts(JSON.parse(readFileSync(path.join(fixtureDir, "wp-posts.json"), "utf8")));
const categories = parseWpCategories(JSON.parse(readFileSync(path.join(fixtureDir, "wp-categories.json"), "utf8")));

assert.equal(rss.length, 4);
assert.equal(rss[0]!.title, "109: Open Fractures w/ Dr. DeBaun");
assert.equal(rss[0]!.libsynId, "34915170");
assert.equal(rss[0]!.durationSec, 2880);
assert.equal(rss[0]!.link, null);
assert.equal(rss[3]!.link, null);

assert.equal(posts.length, 3);
assert.equal(posts[0]!.libsynId, "34915170");
assert.ok(posts[0]!.html.includes("Masquelet"));
assert.equal(posts[2]!.slug, "ep122");

const { catalog, status } = joinCatalog({ rss, posts, categories, generatedAt: "2026-09-12T00:00:00.000Z" });
assert.equal(catalog.episodes.length, 4);
assert.equal(catalog.meta.joined, 3);
assert.equal(catalog.meta.rssOnly, 1);
const openFx = catalog.episodes.find((e) => e.title.includes("Open Fractures"))!;
assert.equal(openFx.join, "rss+wp");
assert.equal(openFx.clinical, true);
assert.equal(openFx.linkable, true);
assert.equal(openFx.id, "libsyn:34915170");
assert.ok(openFx.showNoteBullets.some((b) => /Gustilo-Anderson/.test(b)));
assert.ok(!openFx.bodyText.includes("Get on top of the game"));
const finance = catalog.episodes.find((e) => /Finance/.test(e.title))!;
assert.equal(finance.clinical, false);
assert.equal(finance.series, "finance");
const tibia = catalog.episodes.find((e) => /Tibia/.test(e.title))!;
assert.equal(tibia.join, "rss-only");
assert.equal(tibia.linkable, false);
assert.equal(tibia.clinical, true);
const coronoid = catalog.episodes.find((e) => /Coronoid/.test(e.title))!;
assert.equal(coronoid.join, "rss+wp");
assert.equal(coronoid.url, "https://naileditortho.com/ep122/");
assert.equal(status.unmatchedWp.length, 0);

assert.equal(episodeIdFor(rss[0]!), "libsyn:34915170");
assert.equal(
  stripBoilerplate("Open fractures intro. About Nailed It Ortho: Get on top of the game, deepen your learning."),
  "Open fractures intro.",
);

assert.equal(classifyEpisode({ title: "109: Open Fractures w/ Dr. DeBaun", categories: ["trauma"], bodyText: "" }).clinical, true);
assert.equal(classifyEpisode({ title: "Ortho Finance 18 – Contract Basics", categories: ["finance"], bodyText: "" }).clinical, false);

assert.deepEqual(canonicalNailedItUrl("https://naileditortho.com/109-open-fractures-w-dr-debaun/"), {
  ok: true,
  canonical: "https://naileditortho.com/109-open-fractures-w-dr-debaun/",
});
assert.equal(canonicalNailedItUrl("https://www.naileditortho.com/109-open-fractures-w-dr-debaun").ok, true);
assert.equal(canonicalNailedItUrl("http://naileditortho.com/foo/").ok, false);
assert.equal(canonicalNailedItUrl("https://naileditortho.com/foo/?x=1").ok, false);
assert.equal(canonicalNailedItUrl("https://feeds.libsyn.com/263228/rss").ok, false);
assert.equal(canonicalNailedItUrl("https://naileditortho.com/category/trauma/").ok, false);

const index = buildNailedItIndex(catalog);
const ranked = index.retrieveEpisodes("open fracture Gustilo Anderson Masquelet", 3);
const autoMapped = decideNailedItMap({
  stableGuid: "g-open",
  front: "The Gustilo-Anderson classification is used for open fractures",
  extra: "Masquelet is used for bone defects",
  searchQuery: "open fracture Gustilo Anderson Masquelet",
  candidates: ranked,
});
assert.equal(autoMapped.status, "mapped");
assert.equal(autoMapped.episodes?.[0]?.id, openFx.id);

const autoSkip = decideNailedItMap({
  stableGuid: "g-skip",
  front: "What is the origin of flexor pollicis longus?",
  extra: "",
  searchQuery: "flexor pollicis longus origin",
  candidates: ranked,
});
assert.equal(autoSkip.status, "skipped");

const rssOnlyRanked = index.retrieveEpisodes("tibia shaft fracture", 5, { clinicalOnly: false });
const autoRss = decideNailedItMap({
  stableGuid: "g-tibia",
  front: "Tibia shaft fractures are treated with intramedullary nailing",
  extra: "",
  searchQuery: "tibia shaft fracture intramedullary nail",
  candidates: rssOnlyRanked.map((c) => ({ ...c, linkable: false, url: null })),
});
assert.equal(autoRss.status, "skipped");
assert.equal(autoRss.skipReason, "rss_only_no_link");
assert.deepEqual(eponymHits("severe ARDS hypoxemia", "Sever disease of the calcaneus"), []);
assert.ok(eponymHits("Gustilo type IIIA open fracture", "Open Fractures Gustilo-Anderson").includes("gustilo"));

const autoFill = decideNailedItFill({
  stableGuid: "g-open",
  front: "How are open fractures classified? Gustilo and Anderson Classification",
  extra: "",
  mappedEpisodes: [{ id: openFx.id, title: openFx.title, url: openFx.url!, role: "primary" }],
  passages: index.retrievePassages(openFx.id, "Gustilo open fracture"),
});
assert.equal(autoFill.status, "filled");
assert.ok((autoFill.episodes?.[0]?.bullets?.length ?? 0) >= 1);
assert.ok(!autoFill.episodes?.[0]?.bullets?.some((b) => /https?:\/\//.test(b)));
assert.equal(ranked[0]!.id, openFx.id);
assert.ok(!ranked.some((r) => r.id === finance.id));
const withFinance = index.retrieveEpisodes("physician contract compensation noncompete", 3, { clinicalOnly: false });
assert.equal(withFinance[0]!.id, finance.id);

assert.equal(pendingPacketFileName("map-000001-agent-01"), "nailed-it-map-000001-agent-01-pending.json");
assert.equal(isPendingPacketFileName("nailed-it-map-x-pending.json"), true);
assert.equal(isPendingPacketFileName("../escape-pending.json"), false);
assert.equal(NAILED_IT_FIELD, "Nailed_It");
assert.equal(NAILED_IT_LINK_FIELD, "Nailed_It_Link");
assert.equal(MAX_EPISODES_PER_CARD, 2);
assert.equal(isBlankResource(""), true);
assert.equal(isBlankResource("<p>content</p>"), false);
assert.equal(fieldsFromSnapshot([{ name: "Text", rawValue: "Q" }]).Text, "Q");
assert.ok(searchQueryForCard("ACL graft choice", "hamstring vs BTB", "SnapOrtho::Sports::Knee").includes("Sports Knee"));
assert.equal(formatTimestamp(860), "14:20");

const bulletsOk = validateBullets(
  ["Gustilo-Anderson type drives early antibiotic choice, not just time to debridement."],
  { front: "What classification is used for open fractures?", extra: "" },
);
assert.deepEqual(bulletsOk, []);
assert.ok(validateBullets(["too short", "also short!!"], { front: "x", extra: "" }).includes("bullet_count:2") === false);
assert.ok(
  validateBullets(
    ["See https://naileditortho.com/foo/ for more."],
    { front: "x", extra: "" },
  ).some((e) => e.startsWith("bullet_contains_url")),
);

const html = buildNailedItHtml([
  {
    id: openFx.id,
    title: openFx.title,
    url: openFx.url!,
    role: "primary",
    bullets: ["Gustilo-Anderson type drives early antibiotic choice, not just time to debridement."],
    startSec: 860,
  },
]);
assert.ok(html.includes('data-nailed-it-id="libsyn:34915170"'));
assert.ok(html.includes("14:20"));
assert.ok(html.includes("Gustilo-Anderson"));

const mapCard: NailedItMapCard = {
  noteId: "n1",
  noteVersionId: "v1",
  stableGuid: "g1",
  contentChecksum: "c1",
  deckPath: "SnapOrtho::Trauma",
  front: "open fracture classification",
  extra: "",
  governedTags: [],
  currentNailedIt: "",
  currentNailedItLink: "",
  searchQuery: "open fracture classification",
  candidates: ranked,
};
const mapPacket: NailedItMapPacket = sealMapPacket({
  schemaVersion: NAILED_IT_ENRICHMENT_CONTRACT,
  runKey: NAILED_IT_MAP_RUN_KEY,
  stage: "map",
  sourceReleaseId: "r1",
  sourceReleaseVersion: "0.0.8",
  corpusChecksum: "cc",
  batchKey: "map-b1",
  instructions: [],
  cards: [mapCard],
});
const mapped = applyNailedItMapSidecar(mapPacket, {
  batchKey: "map-b1",
  inputChecksum: mapPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{ stableGuid: "g1", status: "mapped", episodes: [{ id: openFx.id, role: "primary" }] }],
});
assert.equal(mapped.cards[0]!.enrichmentStatus, "mapped");
assert.equal(mapped.cards[0]!.episodes?.[0]!.url, openFx.url);

assert.throws(() => applyNailedItMapSidecar(mapPacket, {
  batchKey: "map-b1",
  inputChecksum: mapPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{ stableGuid: "g1", status: "mapped", episodes: [{ id: "missing", role: "primary" }] }],
}), /sidecar_episode_not_in_candidates/);

const fillCard: NailedItFillCard = {
  ...mapCard,
  skipReason: undefined,
  mappedEpisodes: mapped.cards[0]!.episodes!,
  passages: index.retrievePassages(openFx.id, "Gustilo"),
};
const fillPacket: NailedItFillPacket = sealFillPacket({
  schemaVersion: NAILED_IT_ENRICHMENT_CONTRACT,
  runKey: NAILED_IT_FILL_RUN_KEY,
  stage: "fill",
  sourceReleaseId: "r1",
  sourceReleaseVersion: "0.0.8",
  corpusChecksum: "cc",
  batchKey: "fill-b1",
  instructions: [],
  cards: [fillCard],
});
const filled = applyNailedItFillSidecar(fillPacket, {
  batchKey: "fill-b1",
  inputChecksum: fillPacket.inputChecksum,
  reviewer: { provider: "xai", model: "grok", reviewedAt: new Date().toISOString() },
  cards: [{
    stableGuid: "g1",
    status: "filled",
    episodes: [{
      id: openFx.id,
      bullets: ["Gustilo-Anderson type drives early antibiotic choice, not just time to debridement."],
    }],
  }],
});
assert.equal(filled.cards[0]!.enrichmentStatus, "filled");
assert.equal(filled.cards[0]!.nailedItLink, openFx.url);
const overlays = overlaysFromFillPacket(filled);
assert.equal(overlays.length, 1);
assert.equal(overlays[0]!.nailedItLink, openFx.url);

console.log("nailed-it-enrichment-packet.test.ts OK");
