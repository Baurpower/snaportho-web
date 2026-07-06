import fs from "node:fs";

import { ADULT_RECONSTRUCTION_TOPIC_CATALOG } from "./lib/education/kg-adult-reconstruction-topic-catalog.ts";

const IMPLANT_SLUGS = new Set([
  "femoral-component",
  "acetabular-component",
  "polyethylene-liner",
  "femoral-stem",
  "tibial-baseplate",
  "tibial-insert",
  "patellar-component",
]);
const FIXATION_SLUGS = new Set(["cement-mantle", "press-fit-fixation", "cemented-fixation"]);

for (const entry of ADULT_RECONSTRUCTION_TOPIC_CATALOG) {
  for (const rel of entry.extraRelationships) {
    if (rel.predicate === "involves_anatomy" && (IMPLANT_SLUGS.has(rel.objectSlug) || FIXATION_SLUGS.has(rel.objectSlug))) {
      rel.subjectSlug = rel.objectSlug;
      rel.objectSlug = entry.primaryEntitySlug;
      rel.predicate = "prerequisite_for";
    }
    if (rel.predicate === "indicates_treatment" && rel.objectSlug === "unicompartmental-knee-arthritis") {
      rel.objectSlug = "unicompartmental-knee-arthroplasty";
    }
  }
  for (const ent of entry.specificEntities) {
    if (
      ent.entityType === "complication" &&
      ent.slug === entry.primaryEntitySlug
    ) {
      ent.entityType = "condition";
      ent.metadata = { ...ent.metadata, clinical_kind: "arthroplasty_complication" };
    }
    if (ent.slug === "bone-loss-revision-arthroplasty" && ent.entityType === "biomechanics_concept") {
      ent.entityType = "condition";
      ent.metadata = { ...ent.metadata, clinical_kind: "revision" };
    }
  }
}

// Serialize back - read original and patch specific sections via regex on topic entries
// Instead emit a JSON patch file for manual merge - simpler: rewrite catalog from memory
const catalogPath = "scripts/lib/education/kg-adult-reconstruction-topic-catalog.ts";
let src = fs.readFileSync(catalogPath, "utf8");

// Fix primary complication entities to condition
for (const entry of ADULT_RECONSTRUCTION_TOPIC_CATALOG) {
  const slug = entry.primaryEntitySlug;
  src = src.replace(
    new RegExp(`complication\\("${slug}"`, "g"),
    `condition("${slug}"`
  );
}
src = src.replace(
  /concept\("bone-loss-revision-arthroplasty"/g,
  'condition("bone-loss-revision-arthroplasty"'
);

// Fix relationships in source by re-generating from catalog
for (const entry of ADULT_RECONSTRUCTION_TOPIC_CATALOG) {
  for (const rel of entry.extraRelationships) {
    // fix any remaining involves_anatomy + implant patterns in file
    const old1 = `{ subjectSlug: "${entry.primaryEntitySlug}", predicate: "involves_anatomy", objectSlug: "${rel.objectSlug}"`;
    const new1 = `{ subjectSlug: "${rel.subjectSlug}", predicate: "${rel.predicate}", objectSlug: "${rel.objectSlug}"`;
    if (src.includes(old1) && rel.predicate === "prerequisite_for") {
      src = src.replace(old1, new1);
    }
  }
}

// Bulk fix involves_anatomy -> implant/fixation patterns
const flipPairs: Array<[string, string]> = [];
for (const entry of ADULT_RECONSTRUCTION_TOPIC_CATALOG) {
  for (const rel of entry.extraRelationships) {
    if (rel.predicate === "prerequisite_for" && (IMPLANT_SLUGS.has(rel.subjectSlug) || FIXATION_SLUGS.has(rel.subjectSlug))) {
      flipPairs.push([entry.primaryEntitySlug, rel.subjectSlug]);
    }
  }
}

for (const [primary, implant] of flipPairs) {
  const old = `{ subjectSlug: "${primary}", predicate: "involves_anatomy", objectSlug: "${implant}"`;
  const neu = `{ subjectSlug: "${implant}", predicate: "prerequisite_for", objectSlug: "${primary}"`;
  src = src.split(old).join(neu);
}

// knee OA unicompartmental fix
src = src.replace(
  'objectSlug: "unicompartmental-knee-arthritis", metadata: { management_importance: "moderate" }',
  'objectSlug: "unicompartmental-knee-arthroplasty", metadata: { management_importance: "moderate" }'
);

fs.writeFileSync(catalogPath, src);
console.log("catalog relationships fixed");