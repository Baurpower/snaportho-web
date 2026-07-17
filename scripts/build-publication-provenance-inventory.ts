import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const topics = [
  "adverse-local-tissue-reaction", "aseptic-loosening-tha", "aseptic-loosening-tka",
  "bearing-surface-selection", "bone-loss-revision-arthroplasty", "extensor-mechanism-failure",
  "hip-instability-after-tha", "implant-fixation-principles",
];

const rows = topics.map((topic) => {
  const packetPath = path.join(process.cwd(), "reports", "kg-evidence", topic, "evidence-packet.json");
  const packet = JSON.parse(readFileSync(packetPath, "utf8")) as { sourceEvidence: Array<Record<string, any>> };
  const items = packet.sourceEvidence.map((item) => ({
    evidenceId: item.evidenceId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    path: item.path,
    extractionMethod: item.extractionMethod,
    copyrightPolicy: item.copyrightPolicy,
    publicationClass: item.copyrightPolicy === "metadata_only" || item.extractionMethod === "mapping_count"
      ? "source_metadata_only"
      : item.copyrightPolicy === "internal_draft_only"
        ? "internal_educational_draft"
        : item.copyrightPolicy === "reference_link_only"
          ? "source_reference_only"
          : "structural_or_spec_snapshot",
    recordLevelPublicationEvidence: false,
  }));
  return {
    topic,
    evidencePacket: path.relative(process.cwd(), packetPath),
    evidenceItems: items.length,
    recordLevelPublicationEvidence: 0,
    publicationProvenanceComplete: false,
    exactNextAction: "attach_record_level_sources_to_each_proposed_publication_object",
    items,
  };
});

const outDir = path.join(process.cwd(), "reports", "kg-scaling", "consolidated-publication-review");
mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  neighborhoods: rows.length,
  evidenceItemsInventoried: rows.reduce((sum, row) => sum + row.evidenceItems, 0),
  recordLevelPublicationEvidenceItems: 0,
  conclusion: "Evidence packets contain discovery, structural, mapping, reference, and internal-draft signals; none may be promoted as record-level publication provenance without targeted source attachment.",
  rows,
};
writeFileSync(path.join(outDir, "publication-provenance-inventory.json"), `${JSON.stringify(payload, null, 2)}\n`);
const markdown = [
  "# Publication Provenance Inventory", "", `Generated: ${payload.generatedAt}`, "",
  `Inventoried ${payload.evidenceItemsInventoried} evidence signals across ${rows.length} database-verified neighborhoods. Record-level publication evidence confirmed: **0**.`, "",
  "| Neighborhood | Signals | Record-level | Exact next action |", "|---|---:|---:|---|",
  ...rows.map((row) => `| ${row.topic} | ${row.evidenceItems} | 0 | ${row.exactNextAction} |`), "",
  payload.conclusion, "",
].join("\n");
writeFileSync(path.join(outDir, "publication-provenance-inventory.md"), markdown);
console.log(JSON.stringify({ neighborhoods: rows.length, evidenceItems: payload.evidenceItemsInventoried, recordLevel: 0 }, null, 2));
