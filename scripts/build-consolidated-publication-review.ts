import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const topics = [
  "adverse-local-tissue-reaction",
  "aseptic-loosening-tha",
  "aseptic-loosening-tka",
  "bearing-surface-selection",
  "bone-loss-revision-arthroplasty",
  "extensor-mechanism-failure",
  "hip-instability-after-tha",
  "implant-fixation-principles",
];

const outDir = path.join(process.cwd(), "reports", "kg-scaling", "consolidated-publication-review");
const items = topics.flatMap((topic) => {
  const sourcePath = path.join(process.cwd(), "reports", "kg-pilots", `${topic}-human-review-queue.json`);
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as Array<Record<string, any>>;
  return source.map((item) => {
    const fingerprint = String(item.proposal_fingerprint);
    const kind = fingerprint.startsWith("dp|") ? "decision_point" : "claim";
    const group = fingerprint.includes("board-trap")
      ? "educational_trap_wording"
      : fingerprint.includes("-script")
        ? "case_presentation_script"
        : kind === "decision_point"
          ? "operative_management_pathway"
          : "core_clinical_claim";
    const inheritance = topic.startsWith("aseptic-loosening-") && group === "core_clinical_claim"
      ? "candidate_shared_principle_requires_explicit_THA_and_TKA_context_review"
      : group === "educational_trap_wording" || group === "case_presentation_script"
        ? "batch_reviewable_pattern_but_disposition_remains_topic_specific"
        : "not_inheritable_without_separate_clinical_adjudication";
    return {
      stable_item_id: fingerprint,
      neighborhood: topic,
      reviewer_role: item.route === "ATTENDING_REVIEW" ? "attending" : "clinical_curator",
      object_type: kind,
      review_group: group,
      proposed_object: item.metadata,
      clinical_statement: item.metadata?.claim_text ?? item.reviewer_decision_required,
      supporting_evidence: {
        summary: item.evidence_summary,
        evidence_packet: `reports/kg-evidence/${topic}/evidence-packet.json`,
        limitation: "Current queue cites curriculum/cluster manufacturing metadata; publication-grade record-level provenance is not yet demonstrated.",
      },
      confidence: item.confidence,
      reason_for_review: item.reviewer_decision_required,
      safety_level: item.route === "ATTENDING_REVIEW" ? "management_changing" : "clinical_education",
      downstream_effect: item.route === "ATTENDING_REVIEW"
        ? "Controls whether the operative pathway may leave draft-only status."
        : "Controls whether the claim may enter an approved-only publication manifest.",
      recommended_disposition: "DEFER",
      recommendation_reason: "Defer until a reviewer confirms the statement and record-level source support is attached.",
      inheritance,
      available_actions: ["APPROVE", "APPROVE_WITH_REVISION", "REJECT", "DEFER", "ESCALATE"],
      decision: null,
      revision: null,
      reviewer: null,
      rationale: null,
    };
  });
});

const packet = {
  generatedAt: new Date().toISOString(),
  packetId: "adult-reconstruction-publication-review-wave-1",
  neighborhoods: topics,
  summary: {
    neighborhoodsCovered: topics.length,
    totalItems: items.length,
    clinicalCuratorItems: items.filter((item) => item.reviewer_role === "clinical_curator").length,
    attendingItems: items.filter((item) => item.reviewer_role === "attending").length,
    priorApplicableDecisionsFound: 0,
    separatePacketsAvoided: topics.length - 1,
    automaticDecisionInheritanceApplied: 0,
  },
  decisionContract: {
    allowed: ["APPROVE", "APPROVE_WITH_REVISION", "REJECT", "DEFER", "ESCALATE"],
    requiredForSubmission: ["stable_item_id", "decision", "reviewer", "rationale"],
  },
  items,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "consolidated-review-decision-template.json"), `${JSON.stringify(packet, null, 2)}\n`);

const groups = ["core_clinical_claim", "educational_trap_wording", "case_presentation_script", "operative_management_pathway"];
const markdown = [
  "# Consolidated Adult Reconstruction Publication Review", "",
  `Generated: ${packet.generatedAt}`, "",
  `This packet consolidates ${items.length} unresolved items across ${topics.length} database-verified neighborhoods. It avoids ${topics.length - 1} separate packet-level review sessions but does not fabricate or automatically inherit clinical decisions.`, "",
  "## Source limitation", "",
  "The current items cite curriculum or cluster manufacturing metadata. They do not yet demonstrate publication-grade record-level provenance. The conservative recommendation is DEFER until the reviewer confirms the statement and a record-level source is attached.", "",
  ...groups.flatMap((group) => {
    const grouped = items.filter((item) => item.review_group === group);
    return [
      `## ${group.replaceAll("_", " ")}`, "",
      ...grouped.map((item) => [
        `### ${item.stable_item_id}`, "",
        `- Neighborhood: \`${item.neighborhood}\``,
        `- Reviewer: ${item.reviewer_role}`,
        `- Statement: ${item.clinical_statement}`,
        `- Evidence: ${item.supporting_evidence.summary}`,
        `- Limitation: ${item.supporting_evidence.limitation}`,
        `- Inheritance: ${item.inheritance}`,
        `- Recommended disposition: **${item.recommended_disposition}** — ${item.recommendation_reason}`,
        "- Actions: APPROVE / APPROVE_WITH_REVISION / REJECT / DEFER / ESCALATE", "",
      ].join("\n")),
    ];
  }),
  "## Decision accounting", "",
  "No exact prior decision matched these stable IDs. Existing staging proposal approvals were performed with non-clinical staging labels and are not treated as publication review. CTS decisions are topic-specific and were not inherited into these arthroplasty objects.", "",
].join("\n");
writeFileSync(path.join(outDir, "consolidated-review-packet.md"), markdown);
console.log(JSON.stringify(packet.summary, null, 2));
