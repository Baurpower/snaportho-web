import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { listRegisteredTopics } from "./lib/education/kg-compiler/topic-registry.ts";

type Json = Record<string, any>;

const root = process.cwd();
const outDir = path.join(root, "reports", "kg-scaling");
const priorQueuePath = path.join(outDir, "vertical-completion-queue.json");
const priorPayload = readJson(priorQueuePath);
const priorByTopic = new Map<string, Json>((priorPayload?.queue ?? []).map((item: Json) => [String(item.topic), item]));

function readJson(file: string): Json | undefined {
  if (!existsSync(file)) return undefined;
  try { return JSON.parse(readFileSync(file, "utf8")) as Json; } catch { return undefined; }
}

function file(...parts: string[]): string { return path.join(root, ...parts); }
function relative(candidate?: string): string | null { return candidate ? path.relative(root, candidate) : null; }

function latest(paths: string[]): string | undefined {
  return paths.filter(existsSync).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

const highLeverage = new Set([
  "trauma-fundamentals", "imaging-radiographic-measurements", "complications",
  "surgical-approaches", "implants-instruments", "orthopaedic-anatomy",
  "postoperative-protocols",
]);

const entries = listRegisteredTopics().map((topic) => {
  const key = topic.topicKey;
  const compilerDir = file("reports", "kg-compiler", key);
  const evidence = file("reports", "kg-evidence", key, "evidence-packet.json");
  const auditPath = file("reports", "kg-audits", key, "topic-scorecard.json");
  const applyPath = key === "carpal-tunnel-syndrome"
    ? file("reports", "kg-staging", "carpal-tunnel-syndrome", "cts-0c2b2fa3ef5af8aa", "apply-report.json")
    : file("reports", "kg-pilots", `${key}-staging-apply-result.json`);
  const qualityPath = file("reports", "kg-pilots", `${key}-db-quality.json`);
  const curationPath = file("reports", "kg-pilots", `${key}-curation-report.json`);
  const reviewPath = file("reports", "kg-pilots", `${key}-human-review-queue.json`);
  const publicationPath = file("reports", "kg-compiler", key, "publication-readiness.json");
  const verificationBlockedPath = file("reports", "kg-verticals", key, "strict-db-verification-blocked.json");
  const verificationResolutionPath = file("reports", "kg-verticals", key, "strict-db-verification-resolution.json");
  const finalizationDir = key === "carpal-tunnel-syndrome"
    ? file("reports", "kg-finalization", "carpal-tunnel-syndrome-calibrated")
    : file("reports", "kg-finalization", key);
  const stagingReadinessPath = path.join(finalizationDir, "staging-readiness.json");
  const finalPublicationPath = path.join(finalizationDir, "publication-readiness.json");

  const audit = readJson(auditPath);
  const verificationBlocked = readJson(verificationBlockedPath);
  const verificationResolution = readJson(verificationResolutionPath);
  const verificationBlockedActive = existsSync(verificationBlockedPath)
    && !(verificationResolution?.resolved === true
      && verificationResolution?.supersedes === relative(verificationBlockedPath));
  const apply = readJson(applyPath);
  const quality = readJson(qualityPath);
  const curation = readJson(curationPath);
  const review = readJson(reviewPath);
  const publication = readJson(finalPublicationPath) ?? readJson(publicationPath);
  const staging = readJson(stagingReadinessPath);
  const appliedCount = Object.values(apply?.applied ?? {}).filter((value) => typeof value === "number").reduce((sum: number, value: any) => sum + value, 0);
  const stagingApplied = appliedCount > 0 || apply?.success === true || verificationResolution?.resolved === true;
  const dbBackedAudit = audit?.dataSource?.neighborhood === "database" || audit?.dataSource?.source === "database";
  const databasePresence = dbBackedAudit || quality?.source === "database" || stagingApplied;
  const reviewItems = Array.isArray(review) ? review.length : 0;
  const summary = curation?.summary ?? {};
  const human = Number(summary.HUMAN_REVIEW ?? 0);
  const attending = Number(summary.ATTENDING_REVIEW ?? 0);
  const stagingBlockers = Number(staging?.unique_staging_blockers ?? staging?.staging_blockers?.length ?? 0);
  const publicationBlockers = Number(publication?.unique_publication_blockers ?? publication?.publication_blockers?.length ?? publication?.blockers?.length ?? 0);

  let currentState = "not_started";
  let highest = "registered";
  let remaining = 12;
  let nextAction = "build_evidence_packet";
  if (existsSync(evidence)) { currentState = "evidence_packaged"; highest = "evidence packaged"; remaining = 11; nextAction = "manufacture_draft"; }
  if (existsSync(path.join(compilerDir, "merged-neighborhood-draft.json"))) { currentState = "manufactured_draft"; highest = "manufactured draft"; remaining = 9; nextAction = "complete_review"; }
  if (reviewItems || human || attending) { currentState = "review_pending"; highest = "review packet generated"; remaining = 7; nextAction = attending ? "complete_attending_review" : "complete_human_review"; }
  if (existsSync(path.join(finalizationDir, "finalization-summary.json"))) { currentState = stagingBlockers ? "finalized" : "staging_ready"; highest = stagingBlockers ? "report-only finalization" : "staging ready"; remaining = stagingBlockers ? 5 : 4; nextAction = stagingBlockers ? "resolve_staging_blockers" : "persist_finalized_proposals"; }
  if (stagingApplied) { currentState = "staging_applied"; highest = "staging applied"; remaining = 3; nextAction = "run_strict_db_reload"; }
  if (stagingApplied && dbBackedAudit) { currentState = "database_verified"; highest = "database-backed audit"; remaining = 2; nextAction = "resolve_publication_blockers"; }
  if (publication?.ready_for_publication === true || publication?.ready === true) { currentState = "publication_ready"; highest = "publication ready"; remaining = 1; nextAction = "activate_published_manifest"; }

  if (key === "carpal-tunnel-syndrome" && !(stagingApplied && dbBackedAudit)) {
    currentState = "staging_ready";
    highest = "review-resolved finalization and approved staging packet";
    remaining = 4;
    nextAction = "apply_kg_proposal_batch_memberships_migration";
  }
  if (key === "tibial-shaft-fracture") {
    currentState = "finalized";
    highest = "database-backed report-only finalization";
    remaining = 5;
    nextAction = "consume_review_overlay_and_repair_staging_blockers";
  }
  if (verificationBlockedActive) {
    currentState = "database_verification_blocked";
    highest = "staging applied; strict reload mismatch recorded";
    remaining = 3;
    nextAction = String(verificationBlocked?.exactNextAction ?? "resolve_canonical_mismatch");
  }

  let tier = 4;
  if (["publication_ready", "database_verified", "staging_applied", "staging_ready", "finalized", "database_verification_blocked"].includes(currentState)) tier = 1;
  else if (["review_pending", "manufactured_draft"].includes(currentState)) tier = 2;
  else if (highLeverage.has(key)) tier = 3;
  const score = tier * 100 + remaining * 10 + stagingBlockers * 3 + Math.min(attending + human, 20);

  const candidates = [
    verificationResolutionPath, verificationBlockedActive ? verificationBlockedPath : "", stagingReadinessPath, finalPublicationPath, applyPath, auditPath, reviewPath,
    path.join(compilerDir, "merged-neighborhood-draft.json"), evidence,
  ];
  const prior = priorByTopic.get(key);
  return {
    topic: key,
    displayName: topic.displayName,
    canonicalOwner: topic.pilotKey,
    currentState,
    highestVerifiedCapability: highest,
    stagingBlockerCount: stagingBlockers,
    publicationBlockerCount: publicationBlockers,
    pendingHumanReviewCount: human,
    pendingAttendingReviewCount: attending,
    lastTrustworthyArtifact: relative(latest(candidates)),
    databasePresence,
    databaseVerification: currentState === "database_verification_blocked" ? "database_verification_blocked" : dbBackedAudit ? "database_backed_audit" : databasePresence ? "database_presence_inferred_from_apply_or_quality" : "not_verified",
    estimatedRemainingPhaseCount: remaining,
    recommendedNextAction: nextAction,
    priorityTier: tier,
    priorityScore: score,
    previousPriorityRank: prior?.priorityRank ?? null,
    previousState: prior?.currentState ?? null,
    stateHistory: [
      ...(Array.isArray(prior?.stateHistory) ? prior.stateHistory : prior ? [{ generatedAt: priorPayload?.generatedAt ?? null, state: prior.currentState, priorityRank: prior.priorityRank }] : []),
      { generatedAt: new Date().toISOString(), state: currentState, priorityRank: null },
    ],
    reasonForRank: key === "carpal-tunnel-syndrome"
      ? "Zero staging blockers and an approved packet; blocked only by the missing staging batch-membership table."
      : key === "tibial-shaft-fracture"
        ? "Database-present and finalized with three staging blocker classes plus ten human/attending decisions."
        : `${currentState}; ${databasePresence ? "database presence recorded" : "database presence not verified"}; next action ${nextAction}.`,
  };
}).sort((a, b) => a.priorityScore - b.priorityScore || a.topic.localeCompare(b.topic))
  .map((entry, index) => ({ ...entry, priorityRank: index + 1 }));

mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  methodology: "Artifact-backed ranking of every registered topic; database presence is distinguished from strict database verification.",
  totals: {
    neighborhoods: entries.length,
    stagingReady: entries.filter((item) => item.currentState === "staging_ready").length,
    stagingApplied: entries.filter((item) => item.currentState === "staging_applied").length,
    databaseVerified: entries.filter((item) => item.currentState === "database_verified").length,
    databaseVerificationBlocked: entries.filter((item) => item.currentState === "database_verification_blocked").length,
    publicationBlocked: entries.filter((item) => item.currentState === "database_verified" && item.publicationBlockerCount > 0).length,
    publicationReady: entries.filter((item) => item.currentState === "publication_ready").length,
    productionActive: entries.filter((item) => item.currentState === "production_active").length,
  },
  queue: entries,
};
writeFileSync(path.join(outDir, "vertical-completion-queue.json"), `${JSON.stringify(payload, null, 2)}\n`);

const md = [
  "# Vertical Completion Queue", "", `Generated: ${payload.generatedAt}`, "",
  `Registered neighborhoods: ${entries.length}. Database presence is not treated as strict database verification unless the audit source is database-backed.`, "",
  "| Rank | Neighborhood | State | Stage blockers | Publication blockers | Human | Attending | DB | Next action |",
  "|---:|---|---|---:|---:|---:|---:|---|---|",
  ...entries.map((item) => `| ${item.priorityRank} | ${item.topic} | ${item.currentState} | ${item.stagingBlockerCount} | ${item.publicationBlockerCount} | ${item.pendingHumanReviewCount} | ${item.pendingAttendingReviewCount} | ${item.databaseVerification} | ${item.recommendedNextAction} |`),
  "", "## Ranking rationale", "",
  ...entries.slice(0, 20).map((item) => `${item.priorityRank}. **${item.topic}** — ${item.reasonForRank}`), "",
].join("\n");
writeFileSync(path.join(outDir, "vertical-completion-queue.md"), md);
console.log(JSON.stringify(payload.totals, null, 2));
