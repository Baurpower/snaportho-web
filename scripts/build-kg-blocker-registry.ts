import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type Difficulty = "trivial" | "small" | "moderate" | "major";
type BlockerClass = "identity" | "ownership" | "bridge" | "provenance" | "staging_integrity" | "publication" | "schema";
type Status = "open" | "investigating" | "ready_for_review" | "resolved";

type BlockedReport = {
  topicKey?: string;
  topic?: string;
  discrepancies?: Array<{ fingerprint: string; kind: string; expected: string; observed: string }>;
  missingRelationshipTriples?: string[];
};

type Entry = {
  blockerId: string;
  blockerClass: BlockerClass;
  description: string;
  affectedNeighborhoods: string[];
  affectedNeighborhoodCount: number;
  affectedEntities: string[];
  affectedRelationships: string[];
  estimatedUnlockCount: number;
  estimatedDatabaseVerifiedUnlocks: number;
  estimatedPublicationUnlocks: number;
  requiresHumanReview: boolean;
  requiresAttendingReview: boolean;
  requiresSchemaChange: boolean;
  existingEvidence: string[];
  proposedResolution: string;
  resolutionDifficulty: Difficulty;
  status: Status;
  estimatedResolutionCost: number;
  priorityScore: number;
};

const root = process.cwd();
const verticalsDir = path.join(root, "reports", "kg-verticals");
const outDir = path.join(root, "reports", "kg-scaling");
const cost: Record<Difficulty, number> = { trivial: 1, small: 5, moderate: 15, major: 30 };

function readJson<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

const allBlockedReports = readdirSync(verticalsDir, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => path.join(verticalsDir, item.name, "strict-db-verification-blocked.json"))
  .filter(existsSync)
  .map((filePath) => ({ filePath, report: readJson<BlockedReport>(filePath)! }));
const blockedReports = allBlockedReports.filter(({ filePath }) => {
  const resolutionPath = path.join(path.dirname(filePath), "strict-db-verification-resolution.json");
  const resolution = readJson<any>(resolutionPath);
  return !(resolution?.resolved === true && resolution?.supersedes === path.relative(root, filePath));
});

function topic(report: BlockedReport): string { return String(report.topicKey ?? report.topic); }
function reportsWith(predicate: (item: NonNullable<BlockedReport["discrepancies"]>[number]) => boolean) {
  return blockedReports.filter(({ report }) => (report.discrepancies ?? []).some(predicate));
}
function topicsOf(items: typeof blockedReports): string[] {
  return [...new Set(items.map(({ report }) => topic(report)))].sort();
}
function evidenceOf(items: typeof blockedReports): string[] {
  return items.map(({ filePath }) => path.relative(root, filePath)).sort();
}
function relationshipFingerprint(discrepancy: NonNullable<BlockedReport["discrepancies"]>[number]): string | null {
  return discrepancy.fingerprint.startsWith("bridge|") ? discrepancy.fingerprint : null;
}
function directOnly(items: typeof blockedReports, matcher: (item: NonNullable<BlockedReport["discrepancies"]>[number]) => boolean): number {
  return items.filter(({ report }) => {
    const discrepancies = report.discrepancies ?? [];
    return discrepancies.length > 0 && discrepancies.every(matcher);
  }).length;
}
function make(input: Omit<Entry, "affectedNeighborhoodCount" | "estimatedResolutionCost" | "priorityScore">): Entry {
  const estimatedResolutionCost = cost[input.resolutionDifficulty];
  return {
    ...input,
    affectedNeighborhoodCount: input.affectedNeighborhoods.length,
    estimatedResolutionCost,
    priorityScore: input.estimatedUnlockCount * 5
      + input.estimatedPublicationUnlocks * 10
      + input.estimatedDatabaseVerifiedUnlocks * 3
      - estimatedResolutionCost,
  };
}

const extensor = reportsWith((item) => item.fingerprint === "create|anatomy_structure|extensor-mechanism" && item.kind === "competing_semantic_identity");
const labrum = reportsWith((item) => item.fingerprint === "create|anatomy_structure|labrum");
const bridges = reportsWith((item) => item.kind === "bridge_endpoint_cardinality");
const aggregate = reportsWith((item) => item.kind === "unreconstructable_created_structural_membership");
const polyethylene = reportsWith((item) => item.fingerprint === "create|condition|polyethylene-wear-osteolysis");
const acJoint = reportsWith((item) => item.fingerprint === "create|anatomy_structure|ac-joint");
const hipOa = blockedReports.filter(({ report }) => topic(report) === "hip-osteoarthritis" && (report.missingRelationshipTriples?.length ?? 0) > 0);

const queue = readJson<any>(path.join(outDir, "vertical-completion-queue.json"));
const publicationBlocked = (queue?.queue ?? []).filter((item: any) => item.currentState === "database_verified" && item.publicationBlockerCount > 0).map((item: any) => String(item.topic)).sort();
const stalePublication = publicationBlocked.filter((item: string) => {
  const scorecard = readJson<any>(path.join(root, "reports", "kg-audits", item, "topic-scorecard.json"));
  return (scorecard?.publication?.blockers ?? []).includes("No approved canonical entities in database yet — proposals remain offline/spec.");
});
const reconciledPublication = publicationBlocked.filter((item: string) => {
  const scorecard = readJson<any>(path.join(root, "reports", "kg-audits", item, "topic-scorecard.json"));
  return (scorecard?.dataSource?.reportsLoaded ?? []).includes("publication-readiness-database-state-reconciled");
});
const publicationDatabaseStateResolved = stalePublication.length === 0 && reconciledPublication.length > 0;
const publicationDatabaseStateTopics = publicationDatabaseStateResolved ? reconciledPublication : stalePublication;
const consolidated = readJson<any>(path.join(outDir, "consolidated-publication-review", "consolidated-review-decision-template.json"));
const consolidatedTopics = [...(consolidated?.neighborhoods ?? [])].sort();
const evidenceInventory = path.join(outDir, "consolidated-publication-review", "publication-provenance-inventory.json");
const extensorResolutionPath = path.join(outDir, "blockers", "EXTENSOR_MECHANISM_PROPOSAL_DRIFT", "resolution-report.json");
const extensorInvestigationPath = path.join(outDir, "blockers", "EXTENSOR_MECHANISM_PROPOSAL_DRIFT", "root-cause-investigation.json");
const extensorResolution = readJson<any>(extensorResolutionPath);
const extensorInvestigation = readJson<any>(extensorInvestigationPath);
const extensorResolved = extensorResolution?.ok === true && extensorResolution?.operation === "apply";
const extensorHistoricalTopics = extensorResolved
  ? [...new Set<string>((extensorInvestigation?.blockedNeighborhoods ?? []).map(String))].sort()
  : topicsOf(extensor);
const extensorDatabaseUnlocks = extensorResolved
  ? readdirSync(verticalsDir, { withFileTypes: true }).filter((item) => {
      if (!item.isDirectory()) return false;
      const resolution = readJson<any>(path.join(verticalsDir, item.name, "strict-db-verification-resolution.json"));
      return resolution?.resolved === true && resolution?.blockerId === "EXTENSOR_MECHANISM_PROPOSAL_DRIFT";
    }).length
  : directOnly(extensor, (item) => item.fingerprint === "create|anatomy_structure|extensor-mechanism");
const acJointResolutionPath = path.join(outDir, "blockers", "AC_JOINT_PROPOSAL_DRIFT", "resolution-report.json");
const acJointInvestigationPath = path.join(outDir, "blockers", "AC_JOINT_PROPOSAL_DRIFT", "root-cause-investigation.json");
const acJointResolution = readJson<any>(acJointResolutionPath);
const acJointInvestigation = readJson<any>(acJointInvestigationPath);
const acJointResolved = acJointResolution?.ok === true && acJointResolution?.operation === "apply";
const acJointTopics = acJointResolved
  ? [...new Set<string>((acJointInvestigation?.affectedNeighborhoods ?? []).map(String))].sort()
  : topicsOf(acJoint);

const entries: Entry[] = [
  make({
    blockerId: "EXTENSOR_MECHANISM_PROPOSAL_DRIFT",
    blockerClass: "identity",
    description: "The active semantic proposal says Extensor Mechanism while the applied packets and canonical entity say Knee Extensor Mechanism for the same slug and entity type.",
    affectedNeighborhoods: extensorHistoricalTopics,
    affectedEntities: ["extensor-mechanism"],
    affectedRelationships: [],
    estimatedUnlockCount: extensorHistoricalTopics.length,
    estimatedDatabaseVerifiedUnlocks: extensorDatabaseUnlocks,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: false,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: extensorResolved
      ? [path.relative(root, extensorInvestigationPath), path.relative(root, extensorResolutionPath)]
      : evidenceOf(extensor),
    proposedResolution: "Confirm one active canonical target and knee-specific relationship context, then normalize the stale active proposal label to the canonical preferred label without merging or changing the canonical entity.",
    resolutionDifficulty: "small",
    status: extensorResolved ? "resolved" : "investigating",
  }),
  make({
    blockerId: "CURRICULUM_BRIDGE_NODE_MISSING",
    blockerClass: "bridge",
    description: "An applied curriculum bridge references a curriculum-node slug that does not exist, leaving the proposal marked applied without a canonical bridge result.",
    affectedNeighborhoods: topicsOf(bridges),
    affectedEntities: [],
    affectedRelationships: [...new Set(bridges.flatMap(({ report }) => (report.discrepancies ?? []).map(relationshipFingerprint).filter(Boolean) as string[]))].sort(),
    estimatedUnlockCount: topicsOf(bridges).length,
    estimatedDatabaseVerifiedUnlocks: directOnly(bridges, (item) => item.kind === "bridge_endpoint_cardinality"),
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: evidenceOf(bridges),
    proposedResolution: "Adjudicate whether each missing slug should map to an existing curriculum node or whether the bridge proposal must be rejected; create no curriculum nodes from proposal metadata alone.",
    resolutionDifficulty: "moderate",
    status: "ready_for_review",
  }),
  make({
    blockerId: "PUBLICATION_DATABASE_STATE_STALE",
    blockerClass: "publication",
    description: "Publication audits still report that approved canonical entities are absent even though strict database verification succeeded.",
    affectedNeighborhoods: publicationDatabaseStateTopics,
    affectedEntities: [],
    affectedRelationships: [],
    estimatedUnlockCount: publicationDatabaseStateTopics.length,
    estimatedDatabaseVerifiedUnlocks: 0,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: false,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: publicationDatabaseStateTopics.map((item: string) => `reports/kg-audits/${item}/topic-scorecard.json`),
    proposedResolution: "Regenerate publication readiness from the verified database-backed membership snapshot; do not relax any human, attending, provenance, claim, or decision-point gate.",
    resolutionDifficulty: "small",
    status: publicationDatabaseStateResolved ? "resolved" : "open",
  }),
  make({
    blockerId: "LABRUM_NAMESPACE_COLLISION",
    blockerClass: "identity",
    description: "The shared slug labrum is used for both Acetabular Labrum and Glenoid Labrum, which are clinically distinct anatomy structures.",
    affectedNeighborhoods: topicsOf(labrum),
    affectedEntities: ["labrum"],
    affectedRelationships: [],
    estimatedUnlockCount: topicsOf(labrum).length,
    estimatedDatabaseVerifiedUnlocks: directOnly(labrum, (item) => item.fingerprint === "create|anatomy_structure|labrum"),
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: evidenceOf(labrum),
    proposedResolution: "Split the namespace into explicit acetabular-labrum and glenoid-labrum identities, then retarget only evidence-backed neighborhood memberships and relationships.",
    resolutionDifficulty: "moderate",
    status: "ready_for_review",
  }),
  make({
    blockerId: "PUBLICATION_RECORD_LEVEL_PROVENANCE_GAP",
    blockerClass: "publication",
    description: "Publication objects have source metadata and structural signals but no record-level source attachment.",
    affectedNeighborhoods: consolidatedTopics,
    affectedEntities: [],
    affectedRelationships: [],
    estimatedUnlockCount: consolidatedTopics.length,
    estimatedDatabaseVerifiedUnlocks: 0,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: existsSync(evidenceInventory) ? [path.relative(root, evidenceInventory)] : [],
    proposedResolution: "Attach record-level sources to every proposed publication object and preserve the existing approved-only publication gate.",
    resolutionDifficulty: "moderate",
    status: "ready_for_review",
  }),
  make({
    blockerId: "PUBLICATION_CLINICAL_REVIEW_PENDING",
    blockerClass: "publication",
    description: "Database-verified neighborhoods retain unresolved clinical-curator decisions.",
    affectedNeighborhoods: publicationBlocked,
    affectedEntities: [],
    affectedRelationships: [],
    estimatedUnlockCount: publicationBlocked.length,
    estimatedDatabaseVerifiedUnlocks: 0,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: ["reports/kg-scaling/consolidated-publication-review/consolidated-review-decision-template.json", ...publicationBlocked.map((item: string) => `reports/kg-audits/${item}/topic-scorecard.json`)],
    proposedResolution: "Consume explicit clinical-curator decisions through the existing review workflow; do not infer or inherit clinically distinct decisions.",
    resolutionDifficulty: "major",
    status: "ready_for_review",
  }),
  make({
    blockerId: "PUBLICATION_ATTENDING_REVIEW_PENDING",
    blockerClass: "publication",
    description: "Database-verified neighborhoods retain unresolved attending decisions for publication-sensitive objects.",
    affectedNeighborhoods: publicationBlocked,
    affectedEntities: [],
    affectedRelationships: [],
    estimatedUnlockCount: publicationBlocked.length,
    estimatedDatabaseVerifiedUnlocks: 0,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: true,
    requiresSchemaChange: false,
    existingEvidence: ["reports/kg-scaling/consolidated-publication-review/consolidated-review-decision-template.json", ...publicationBlocked.map((item: string) => `reports/kg-audits/${item}/topic-scorecard.json`)],
    proposedResolution: "Consume explicit attending decisions through the existing post-review workflow.",
    resolutionDifficulty: "major",
    status: "ready_for_review",
  }),
  make({
    blockerId: "AGGREGATE_APPLY_PROVENANCE_GAP",
    blockerClass: "provenance",
    description: "Legacy apply reports record created structural objects only as aggregate counts, so exact proposal-to-canonical membership cannot be reconstructed from the report alone.",
    affectedNeighborhoods: topicsOf(aggregate),
    affectedEntities: [],
    affectedRelationships: [],
    estimatedUnlockCount: topicsOf(aggregate).length,
    estimatedDatabaseVerifiedUnlocks: directOnly(aggregate, (item) => item.kind === "unreconstructable_created_structural_membership"),
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: evidenceOf(aggregate),
    proposedResolution: "The exact reconstruction unlocked the two one-to-one cases. The remaining Polyethylene packet has ten unique unrecorded structural fingerprints against nine aggregate-created objects, so a provenance reviewer must adjudicate the extra entity before membership repair.",
    resolutionDifficulty: "moderate",
    status: "ready_for_review",
  }),
  make({
    blockerId: "AC_JOINT_PROPOSAL_DRIFT",
    blockerClass: "identity",
    description: "The active semantic proposal says Ac Joint while the blocked packet expects Acromioclavicular Joint for slug ac-joint.",
    affectedNeighborhoods: acJointTopics,
    affectedEntities: ["ac-joint"],
    affectedRelationships: [],
    estimatedUnlockCount: acJointTopics.length,
    estimatedDatabaseVerifiedUnlocks: 0,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: false,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: acJointResolved
      ? [path.relative(root, acJointInvestigationPath), path.relative(root, acJointResolutionPath)]
      : evidenceOf(acJoint),
    proposedResolution: "Verify canonical identity and relationship context, then normalize stale proposal label metadata if it is the same entity.",
    resolutionDifficulty: "small",
    status: acJointResolved ? "resolved" : "investigating",
  }),
  make({
    blockerId: "HIP_OA_RELATIONSHIP_APPLY_GAP",
    blockerClass: "staging_integrity",
    description: "Hip Osteoarthritis proposals were marked applied while 27 expected canonical relationship triples are absent.",
    affectedNeighborhoods: topicsOf(hipOa),
    affectedEntities: ["hip-osteoarthritis"],
    affectedRelationships: hipOa.flatMap(({ report }) => report.missingRelationshipTriples ?? []).sort(),
    estimatedUnlockCount: topicsOf(hipOa).length,
    estimatedDatabaseVerifiedUnlocks: topicsOf(hipOa).length,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: evidenceOf(hipOa),
    proposedResolution: "Reconcile each applied proposal outcome against canonical state; do not recreate clinical edges until identity and predicate intent are confirmed.",
    resolutionDifficulty: "major",
    status: "ready_for_review",
  }),
  make({
    blockerId: "POLYETHYLENE_CONDITION_PROCEDURE_OWNERSHIP_MISMATCH",
    blockerClass: "ownership",
    description: "The blocked packet expects Polyethylene Wear and Osteolysis as a condition while the active canonical row uses the same slug as a procedure.",
    affectedNeighborhoods: topicsOf(polyethylene),
    affectedEntities: ["polyethylene-wear-osteolysis"],
    affectedRelationships: [],
    estimatedUnlockCount: topicsOf(polyethylene).length,
    estimatedDatabaseVerifiedUnlocks: 0,
    estimatedPublicationUnlocks: 0,
    requiresHumanReview: true,
    requiresAttendingReview: false,
    requiresSchemaChange: false,
    existingEvidence: evidenceOf(polyethylene),
    proposedResolution: "Adjudicate condition versus procedure ownership and split identities if both concepts are required; do not relabel the active canonical row automatically.",
    resolutionDifficulty: "moderate",
    status: "ready_for_review",
  }),
].filter((entry) => entry.affectedNeighborhoodCount > 0)
  .sort((left, right) => Number(left.status === "resolved") - Number(right.status === "resolved")
    || right.priorityScore - left.priorityScore
    || left.blockerId.localeCompare(right.blockerId));

mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  methodology: {
    formula: "(estimatedUnlockCount * 5) + (estimatedPublicationUnlocks * 10) + (estimatedDatabaseVerifiedUnlocks * 3) - estimatedResolutionCost",
    resolutionCost: cost,
    note: "estimatedUnlockCount counts neighborhoods whose named blocker would be cleared; database/publication unlocks count immediate lifecycle transitions with no other known blocker.",
  },
  totals: {
    blockerClasses: entries.length,
    blockedNeighborhoods: blockedReports.length,
    publicationBlockedNeighborhoods: publicationBlocked.length,
  },
  blockers: entries,
};
writeFileSync(path.join(outDir, "blocker-registry.json"), `${JSON.stringify(payload, null, 2)}\n`);

const md = [
  "# Knowledge Graph Blocker Registry", "", `Generated: ${payload.generatedAt}`, "",
  `Normalized blocker classes: ${entries.length}. Database-verification-blocked neighborhoods: ${blockedReports.length}. Publication-blocked neighborhoods: ${publicationBlocked.length}.`, "",
  "| Rank | Blocker ID | Class | Affected | Immediate DB unlocks | Publication unlocks | Human | Attending | Schema | Difficulty | Status | ROI |",
  "|---:|---|---|---:|---:|---:|---|---|---|---|---|---:|",
  ...entries.map((entry, index) => `| ${index + 1} | ${entry.blockerId} | ${entry.blockerClass} | ${entry.affectedNeighborhoodCount} | ${entry.estimatedDatabaseVerifiedUnlocks} | ${entry.estimatedPublicationUnlocks} | ${entry.requiresHumanReview ? "yes" : "no"} | ${entry.requiresAttendingReview ? "yes" : "no"} | ${entry.requiresSchemaChange ? "yes" : "no"} | ${entry.resolutionDifficulty} | ${entry.status} | ${entry.priorityScore} |`),
  "", "## Resolution summaries", "",
  ...entries.flatMap((entry) => [
    `### ${entry.blockerId}`,
    "",
    entry.description,
    "",
    `Affected neighborhoods (${entry.affectedNeighborhoodCount}): ${entry.affectedNeighborhoods.map((item) => `\`${item}\``).join(", ")}.`,
    "",
    `Proposed resolution: ${entry.proposedResolution}`,
    "",
  ]),
];
writeFileSync(path.join(outDir, "blocker-registry.md"), `${md.join("\n")}\n`);

const ranking = [
  "# Blocker Priority Ranking", "", `Generated: ${payload.generatedAt}`, "",
  `Formula: \`${payload.methodology.formula}\`. Cost scale: trivial 1, small 5, moderate 15, major 30.`, "",
  ...entries.map((entry, index) => `${index + 1}. **${entry.blockerId}** (${entry.status}) — ROI ${entry.priorityScore}; clears ${entry.estimatedUnlockCount} blocker instances and directly unlocks ${entry.estimatedDatabaseVerifiedUnlocks} database verification(s).`),
  "",
];
writeFileSync(path.join(outDir, "blocker-priority-ranking.md"), ranking.join("\n"));
console.log(JSON.stringify({ blockerClasses: entries.length, highestPriority: entries[0]?.blockerId, highestPriorityScore: entries[0]?.priorityScore }, null, 2));
