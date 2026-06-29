export type OrthobulletsReviewedTopicOverride = {
  specialtySlug: string;
  topicSlug: string;
  normalizedTopicLabel: string;
  decision: "accept";
  reviewReason: string;
  approvedOn: string;
  notes: string;
};

export const ORTHOBULLETS_REVIEWED_TOPIC_OVERRIDES: OrthobulletsReviewedTopicOverride[] = [
  {
    specialtySlug: "recon",
    topicSlug: "wear-and-osteolysis-basic-science",
    normalizedTopicLabel: "Wear & Osteolysis Basic Science",
    decision: "accept",
    reviewReason: "manually_reviewed_valid_topic",
    approvedOn: "2026-06-26",
    notes: "Manually reviewed and approved as a valid curriculum topic for Orthobullets Phase 2 import.",
  },
  {
    specialtySlug: "knee-sports",
    topicSlug: "visceral-blunt-trauma",
    normalizedTopicLabel: "Visceral Blunt Trauma",
    decision: "accept",
    reviewReason: "manually_reviewed_valid_topic",
    approvedOn: "2026-06-26",
    notes: "Manually reviewed and approved as a valid curriculum topic for Orthobullets Phase 2 import.",
  },
];
