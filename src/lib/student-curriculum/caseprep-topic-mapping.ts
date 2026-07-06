export type CasePrepTopicMapping = {
  topicId: string;
  slug: string;
  displayName: string;
};

export const CASEPREP_TOPIC_MAPPINGS: CasePrepTopicMapping[] = [
  { topicId: "acl-tear", slug: "acl-reconstruction", displayName: "ACL Reconstruction" },
  { topicId: "total-hip-arthroplasty", slug: "total-hip-arthroplasty", displayName: "Total Hip Arthroplasty" },
  { topicId: "total-knee-arthroplasty", slug: "total-knee-arthroplasty", displayName: "Total Knee Arthroplasty" },
  { topicId: "rotator-cuff-tear", slug: "rotator-cuff-repair", displayName: "Rotator Cuff Repair" },
  { topicId: "ankle-fracture", slug: "ankle-fracture-orif", displayName: "Ankle Fracture ORIF" },
  { topicId: "hip-fracture", slug: "hip-fracture", displayName: "Hip Fracture" },
  { topicId: "distal-radius-fracture", slug: "distal-radius-orif", displayName: "Distal Radius ORIF" },
  { topicId: "lumbar-disc-herniation", slug: "lumbar-microdiscectomy", displayName: "Lumbar Microdiscectomy" },
  { topicId: "carpal-tunnel-syndrome", slug: "carpal-tunnel-release", displayName: "Carpal Tunnel Release" },
];

const MAPPING_BY_TOPIC_ID = CASEPREP_TOPIC_MAPPINGS.reduce<
  Record<string, CasePrepTopicMapping>
>((accumulator, mapping) => {
  accumulator[mapping.topicId] = mapping;
  return accumulator;
}, {});

export function getCasePrepSlugForTopic(topicId: string): string | null {
  return MAPPING_BY_TOPIC_ID[topicId]?.slug ?? null;
}

export function getCasePrepMappingForTopic(
  topicId: string
): CasePrepTopicMapping | null {
  return MAPPING_BY_TOPIC_ID[topicId] ?? null;
}