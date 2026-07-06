/**
 * Prepare topic slices for Adult Reconstruction cluster topics.
 * Derived from kg-adult-reconstruction-topic-catalog.ts manufacturing seeds.
 */

import { ADULT_RECONSTRUCTION_TOPIC_CATALOG } from "../kg-adult-reconstruction-topic-catalog.ts";
import type { PrepareTopicSlice } from "./prepare-topic-slices.ts";

export function loadAdultReconstructionPrepareSlice(topicId: string): PrepareTopicSlice | undefined {
  const entry = ADULT_RECONSTRUCTION_TOPIC_CATALOG.find((t) => t.topicKey === topicId || t.prepareTopicId === topicId);
  if (!entry) return undefined;

  const groupLabel =
    entry.clusterGroup === "hip"
      ? "Hip Reconstruction"
      : entry.clusterGroup === "knee"
        ? "Knee Reconstruction"
        : "Reconstruction Principles";

  return {
    topicId: entry.topicKey,
    title: entry.displayName,
    trackId: "adult-reconstruction",
    subspecialty: "Adult Reconstruction",
    tags: [entry.clusterGroup, "arthroplasty", entry.topicKey],
    learningObjectives: [
      `Recognize core concepts in ${entry.displayName}.`,
      `Connect ${entry.displayName} to shared anatomy, implant concepts, and trauma neighborhoods.`,
      `Outline attending-level review priorities for ${entry.displayName}.`,
    ],
    fast: {
      mustKnow: [`${entry.displayName} indication language`, "Implant and fixation vocabulary", "Cross-neighborhood trauma links"],
      anatomyFocus: ["Shared adult reconstruction anatomy hub", "Implant concepts hub", "Trauma neighborhood bridges"],
      oneLiner: entry.oneLiner,
      pimpQuestions: [`What drives management in ${entry.displayName}?`, "When does this become a revision problem?"],
      orSurvivalTips: ["Use implant component vocabulary", "Mention infection workup when pain is unexplained"],
      caseSteps: ["State indication", "Review imaging", "Name implant/fixation concepts", "Outline escalation pathway"],
    },
    deep: {
      anatomy: ["Hip and knee joint surfaces", "Extensor mechanism", "Implant-bone interfaces"],
      classification: [`${groupLabel} classification frameworks`],
      imaging: ["Weight-bearing radiographs", "Periprosthetic lucency and osteolysis patterns"],
      decisionMaking: ["Symptoms, implant stability, bone quality, infection exclusion"],
      treatmentOptions: ["Nonoperative care", "Primary arthroplasty", "Revision and staged strategies"],
      boardPearls: [entry.oneLiner],
      complications: ["Infection", "Loosening", "Instability", "Periprosthetic fracture"],
    },
    sourcePath: `adult-reconstruction-cluster:${entry.curriculumNodeSlug}`,
  };
}