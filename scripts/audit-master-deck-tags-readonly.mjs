import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function all(table, select, configure = (query) => query) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const result = await configure(db.from(table).select(select)).range(start, start + 999);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 1000) return rows;
  }
}

const manifestKeyArg = process.argv.find((value) => value.startsWith("--manifest-key="));
let manifestQuery = db.from("rendered_anki_tag_manifests")
  .select("id,manifest_key,deck_release_id,status,published_at");
manifestQuery = manifestKeyArg
  ? manifestQuery.eq("manifest_key", manifestKeyArg.slice("--manifest-key=".length))
  : manifestQuery.eq("status", "published").order("published_at", { ascending: false }).limit(1);
const manifestResult = await manifestQuery.maybeSingle();
if (manifestResult.error) throw manifestResult.error;
if (!manifestResult.data) throw new Error("published_tag_manifest_not_found");
const manifestId = manifestResult.data.id;
const manifestKey = manifestResult.data.manifest_key;
const deckReleaseId = manifestResult.data.deck_release_id;

const [manifestCards, releaseCards, cards, allSources] = await Promise.all([
  all(
    "rendered_anki_tag_manifest_cards",
    "id,canonical_card_id,canonical_card_version_id,rendered_tags",
    (query) => query.eq("manifest_id", manifestId),
  ),
  all(
    "anki_deck_release_cards",
    "canonical_card_id,deck_path,note_guid",
    (query) => query.eq("deck_release_id", deckReleaseId),
  ),
  all("canonical_cards", "id,title"),
  all("rendered_anki_tag_sources", "manifest_card_id,rendered_tag,source_kind,assertion_id"),
]);

const releaseByCard = new Map(releaseCards.map((row) => [row.canonical_card_id, row]));
const titleByCard = new Map(cards.map((row) => [row.id, row.title]));
const rows = manifestCards.map((row) => ({
  ...row,
  deck_path: releaseByCard.get(row.canonical_card_id)?.deck_path ?? "",
  note_guid: releaseByCard.get(row.canonical_card_id)?.note_guid ?? "",
  title: titleByCard.get(row.canonical_card_id) ?? "",
}));
const manifestCardIds = new Set(manifestCards.map((row) => row.id));
const sources = allSources.filter((row) => manifestCardIds.has(row.manifest_card_id));

const frequency = new Map();
for (const row of rows) {
  for (const tag of row.rendered_tags) frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
}

const specialties = {
  spine: { deck: /::(?:[^:]*spine|spine[^:]*)/i, tag: "SnapOrtho::Specialty::Spine" },
  hand: { deck: /::(?:[^:]*hand|hand[^:]*)/i, tag: "SnapOrtho::Specialty::Hand_Upper_Extremity" },
  foot: { deck: /::(?:[^:]*foot|ankle[^:]*)/i, tag: "SnapOrtho::Specialty::Foot_Ankle" },
  shoulder: { deck: /::(?:[^:]*shoulder|elbow[^:]*)/i, tag: "SnapOrtho::Specialty::Shoulder_Elbow" },
  pediatrics: { deck: /::(?:[^:]*pediatr|peds[^:]*)/i, tag: "SnapOrtho::Specialty::Pediatric_Orthopedics" },
  oncology: { deck: /::(?:[^:]*tumou?r|oncolog[^:]*)/i, tag: "SnapOrtho::Specialty::Orthopedic_Oncology" },
};

const findings = [];
const reviewCandidates = [];
for (const [name, rule] of Object.entries(specialties)) {
  const candidates = rows.filter((row) => rule.deck.test(row.deck_path));
  const missing = candidates.filter((row) => !row.rendered_tags.includes(rule.tag));
  reviewCandidates.push(...missing.map((row) => ({ ...row, signal: `deck_${name}_missing_matching_specialty` })));
  findings.push({
    signal: `deck_${name}_missing_matching_specialty`,
    count: missing.length,
    denominator: candidates.length,
    examples: missing.slice(0, 8),
  });
}

const suspiciousPaths = [
  ["distal_radius_under_hand_osteology", "SnapOrtho::Anatomy::Hand::Osteology::Distal_Radius"],
  ["medial_meniscus_classed_as_ligament", "SnapOrtho::Anatomy::Leg_Knee::Ligaments::Medial_Meniscus"],
  ["calcar_under_general_anatomy", "SnapOrtho::Anatomy::General::Osteology::Calcar"],
  ["pelvis_repeated_as_child_of_pelvis", "SnapOrtho::Anatomy::Pelvis::Osteology::Pelvis"],
];
for (const [signal, tag] of suspiciousPaths) {
  const matches = rows.filter((row) => row.rendered_tags.includes(tag));
  reviewCandidates.push(...matches.map((row) => ({ ...row, signal })));
  findings.push({ signal, count: matches.length, denominator: rows.length, examples: matches.slice(0, 8) });
}

const tagNames = [...frequency.keys()];
const normalized = new Map();
for (const tag of tagNames) {
  const key = tag.toLowerCase().replace(/_fractures\b/g, "_fracture");
  if (!normalized.has(key)) normalized.set(key, []);
  normalized.get(key).push(tag);
}
const singularPluralCollisions = [...normalized.values()]
  .filter((group) => group.length > 1)
  .map((group) => group.map((tag) => ({ tag, count: frequency.get(tag) })));

const oneOffTags = [...frequency.entries()].filter(([, count]) => count === 1);
const cardsByTagCount = Object.entries(
  rows.reduce((acc, row) => {
    acc[row.rendered_tags.length] = (acc[row.rendered_tags.length] ?? 0) + 1;
    return acc;
  }, {}),
).sort((a, b) => Number(a[0]) - Number(b[0]));

const sourceKindCounts = Object.entries(sources.reduce((acc, row) => {
  acc[row.source_kind] = (acc[row.source_kind] ?? 0) + 1;
  return acc;
}, {})).sort(([a], [b]) => a.localeCompare(b));
const unexplainedClinicalTags = sources.filter((row) =>
  row.source_kind !== "assertion" && /^SnapOrtho::(?:Anatomy|Diagnosis|Treatment|Specialty)::/.test(row.rendered_tag));
findings.push({
  signal: "clinical_tag_without_assertion_provenance",
  count: unexplainedClinicalTags.length,
  denominator: sources.length,
  examples: unexplainedClinicalTags.slice(0, 8),
});

const report = {
  contract_version: "snaportho-master-deck-tag-audit.v1",
  recommendation: "DO_NOT_PUBLISH",
  safety: { database_access: "read_only", mutations: 0 },
  blockers: [
    "manifest_does_not_cover_full_deck",
    "clinical_tags_without_assertion_provenance",
    "canonical_tag_collisions",
    "known_ontology_path_errors",
  ],

  generated_at: new Date().toISOString(),
  manifest_id: manifestId,
  manifest_key: manifestKey,
  deck_release_id: deckReleaseId,
  deck_cards: releaseCards.length,
  tagged_cards: rows.length,
  untagged_cards: releaseCards.length - rows.length,
  coverage_percent: Number((100 * rows.length / releaseCards.length).toFixed(1)),
  distinct_rendered_tags: frequency.size,
  rendered_tag_assignments: [...frequency.values()].reduce((sum, count) => sum + count, 0),
  one_off_tag_count: oneOffTags.length,
  source_kind_counts: sourceKindCounts,
  unexplained_clinical_tag_count: unexplainedClinicalTags.length,
  cards_by_tag_count: cardsByTagCount,
  singular_plural_collisions: singularPluralCollisions,
  findings,
};

const outArg = process.argv.find((value) => value.startsWith("--out="));
if (outArg) {
  const out = path.resolve(outArg.slice("--out=".length));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  const uniqueReviewCandidates = [...new Map(reviewCandidates.map((example) => [
    `${example.signal}:${example.canonical_card_id ?? example.manifest_card_id}:${(example.rendered_tags ?? []).join("|")}`,
    example,
  ])).values()];
  const reviewRows = uniqueReviewCandidates.map((example, index) => ({
    issue_id: `${example.signal}:${index + 1}:${example.canonical_card_id ?? example.manifest_card_id ?? "tag"}`,
    signal: example.signal,
    canonical_card_id: example.canonical_card_id ?? "",
    canonical_card_version_id: example.canonical_card_version_id ?? "",
    note_guid: example.note_guid ?? "",
    title: example.title ?? "",
    deck_path: example.deck_path ?? "",
    current_tags: Array.isArray(example.rendered_tags) ? example.rendered_tags.join(" | ") : example.rendered_tag ?? "",
    reviewer_decision: "",
    replacement_tags: "",
    reviewer_rationale: "",
  }));
  const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const headers = Object.keys(reviewRows[0] ?? {
    issue_id: "", signal: "", canonical_card_id: "", canonical_card_version_id: "", note_guid: "",
    title: "", deck_path: "", current_tags: "", reviewer_decision: "", replacement_tags: "", reviewer_rationale: "",
  });
  fs.writeFileSync(path.join(out, "review-queue.csv"), [headers.join(","), ...reviewRows.map((row) => headers.map((key) => csv(row[key])).join(","))].join("\n") + "\n");
  const markdown = [
    "# SnapOrtho master-deck tag audit", "",
    `Recommendation: **${report.recommendation}**`, "",
    `- Coverage: ${report.tagged_cards}/${report.deck_cards} (${report.coverage_percent}%)`,
    `- Missing cards: ${report.untagged_cards}`,
    `- Distinct tags: ${report.distinct_rendered_tags}`,
    `- One-off tags: ${report.one_off_tag_count}`,
    `- Clinical tags without assertion provenance: ${report.unexplained_clinical_tag_count}`,
    `- Singular/plural collisions: ${report.singular_plural_collisions.length}`, "",
    "## Blocking findings", "",
    ...report.findings.filter((finding) => finding.count > 0).map((finding) =>
      `- ${finding.signal}: ${finding.count}/${finding.denominator}`), "",
    "## Review protocol", "",
    "Use `KEEP`, `REMOVE`, `REPLACE`, or `ADD` in `reviewer_decision`. `REPLACE` and `ADD` require governed paths in `replacement_tags`; every non-KEEP decision requires a rationale.", "",
  ].join("\n");
  fs.writeFileSync(path.join(out, "audit.md"), markdown);
  console.log(JSON.stringify({ out, recommendation: report.recommendation, deck_cards: report.deck_cards, tagged_cards: report.tagged_cards, blockers: report.blockers }, null, 2));
} else {
  console.log(JSON.stringify(report, null, 2));
}
