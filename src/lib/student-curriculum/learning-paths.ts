import { getTopicById, getTrackById } from "./curriculum-recommendations";
import type { CurriculumTopic } from "./curriculum-types";

export type LearningPathWeek = {
  week: number;
  label: string;
  topicIds: string[];
};

export type LearningPathView = {
  trackId: string;
  trackTitle: string;
  weeks: Array<{
    week: number;
    label: string;
    topics: CurriculumTopic[];
    completedCount: number;
    totalCount: number;
  }>;
  totalTopics: number;
  completedTopics: number;
  currentWeek: number;
  currentTopic: CurriculumTopic | null;
};

const LEARNING_PATH_WEEKS: Record<string, LearningPathWeek[]> = {
  trauma: [
    {
      week: 1,
      label: "Week 1 — Wrist, hip, and femur",
      topicIds: ["distal-radius-fracture", "hip-fracture", "tibial-shaft-fracture"],
    },
    {
      week: 2,
      label: "Week 2 — Ankle, plateau, and pilon",
      topicIds: ["ankle-fracture", "tibial-plateau-fracture", "pilon-fracture"],
    },
    {
      week: 3,
      label: "Week 3 — Pelvis, acetabulum, and ex-fix",
      topicIds: ["pelvic-fracture", "acetabulum-fracture", "external-fixation"],
    },
    {
      week: 4,
      label: "Week 4 — Urgent limb threats",
      topicIds: ["compartment-syndrome", "open-fractures", "polytrauma"],
    },
  ],
  spine: [
    {
      week: 1,
      label: "Week 1 — Lumbar syndromes",
      topicIds: ["lumbar-disc-herniation", "lumbar-spinal-stenosis", "lumbar-decompression"],
    },
    {
      week: 2,
      label: "Week 2 — Cervical myelopathy and trauma",
      topicIds: ["cervical-myelopathy", "cervical-trauma", "cauda-equina-syndrome"],
    },
    {
      week: 3,
      label: "Week 3 — Fusion fundamentals",
      topicIds: ["acdf", "tlif", "adult-spinal-deformity"],
    },
  ],
  "adult-reconstruction": [
    {
      week: 1,
      label: "Week 1 — Arthritis fundamentals",
      topicIds: ["hip-osteoarthritis", "knee-osteoarthritis", "total-hip-arthroplasty"],
    },
    {
      week: 2,
      label: "Week 2 — Arthroplasty and complications",
      topicIds: ["total-knee-arthroplasty", "periprosthetic-joint-infection", "revision-arthroplasty"],
    },
    {
      week: 3,
      label: "Week 3 — Periprosthetic fracture",
      topicIds: ["periprosthetic-fracture", "periprosthetic-joint-infection"],
    },
  ],
  sports: [
    {
      week: 1,
      label: "Week 1 — Knee instability",
      topicIds: ["acl-tear", "meniscus-tear", "achilles-tendon-rupture"],
    },
    {
      week: 2,
      label: "Week 2 — Shoulder and cartilage",
      topicIds: ["rotator-cuff-tear", "shoulder-instability", "cartilage-restoration"],
    },
  ],
  hand: [
    {
      week: 1,
      label: "Week 1 — Clinic essentials",
      topicIds: ["carpal-tunnel-syndrome", "trigger-finger", "metacarpal-fracture"],
    },
    {
      week: 2,
      label: "Week 2 — Tendon and wrist trauma",
      topicIds: ["flexor-tendon-injury", "distal-radius-fracture-hand-perspective"],
    },
  ],
  pediatrics: [
    {
      week: 1,
      label: "Week 1 — Classic pediatric trauma",
      topicIds: ["supracondylar-humerus-fracture", "pediatric-forearm-fracture", "scfe"],
    },
    {
      week: 2,
      label: "Week 2 — Developmental conditions",
      topicIds: ["clubfoot", "developmental-dysplasia-hip"],
    },
  ],
  "foot-ankle": [
    {
      week: 1,
      label: "Week 1 — Ankle injuries",
      topicIds: ["ankle-sprain", "ankle-fracture-foot-ankle-perspective", "achilles-tendon-rupture-foot-ankle"],
    },
    {
      week: 2,
      label: "Week 2 — Hindfoot and forefoot",
      topicIds: ["calcaneus-fracture", "hallux-valgus"],
    },
  ],
  "shoulder-elbow": [
    {
      week: 1,
      label: "Week 1 — Shoulder trauma and cuff",
      topicIds: ["proximal-humerus-fracture", "rotator-cuff-tear-shoulder", "shoulder-instability"],
    },
    {
      week: 2,
      label: "Week 2 — Elbow and arthroplasty",
      topicIds: ["elbow-dislocation", "olecranon-fracture", "shoulder-arthroplasty"],
    },
  ],
  tumor: [
    {
      week: 1,
      label: "Week 1 — Lesion workup",
      topicIds: ["metastatic-bone-disease", "enchondroma", "pathologic-fracture"],
    },
    {
      week: 2,
      label: "Week 2 — Malignancy fundamentals",
      topicIds: ["osteosarcoma", "multiple-myeloma-bone-disease"],
    },
  ],
  "basic-science": [
    {
      week: 1,
      label: "Week 1 — OITE foundations",
      topicIds: ["fracture-healing", "bone-remodeling", "gait-basics"],
    },
  ],
};

export function getLearningPathWeeks(trackId: string): LearningPathWeek[] {
  const track = getTrackById(trackId);
  if (!track) return [];

  const configured = LEARNING_PATH_WEEKS[trackId];
  if (configured) {
    return configured;
  }

  const chunkSize = 3;
  const weeks: LearningPathWeek[] = [];
  for (let index = 0; index < track.topicIds.length; index += chunkSize) {
    const topicIds = track.topicIds.slice(index, index + chunkSize);
    weeks.push({
      week: weeks.length + 1,
      label: `Week ${weeks.length + 1}`,
      topicIds,
    });
  }
  return weeks;
}

export function buildLearningPathView(params: {
  trackId: string;
  completedTopicIds?: string[];
  currentWeek?: number;
}): LearningPathView | null {
  const track = getTrackById(params.trackId);
  if (!track) return null;

  const completedSet = new Set(params.completedTopicIds ?? []);
  const weeks = getLearningPathWeeks(params.trackId).map((week) => {
    const topics = week.topicIds
      .map((topicId) => getTopicById(topicId))
      .filter((topic): topic is CurriculumTopic => Boolean(topic));
    const completedCount = topics.filter((topic) =>
      completedSet.has(topic.id)
    ).length;

    return {
      week: week.week,
      label: week.label,
      topics,
      completedCount,
      totalCount: topics.length,
    };
  });

  const allTopics = weeks.flatMap((week) => week.topics);
  const completedTopics = allTopics.filter((topic) =>
    completedSet.has(topic.id)
  ).length;

  const currentWeek =
    params.currentWeek ??
    weeks.find((week) => week.completedCount < week.totalCount)?.week ??
    weeks[weeks.length - 1]?.week ??
    1;

  const currentWeekData =
    weeks.find((week) => week.week === currentWeek) ?? weeks[0];
  const currentTopic =
    currentWeekData?.topics.find((topic) => !completedSet.has(topic.id)) ??
    currentWeekData?.topics[0] ??
    null;

  return {
    trackId: track.id,
    trackTitle: track.title,
    weeks,
    totalTopics: allTopics.length,
    completedTopics,
    currentWeek,
    currentTopic,
  };
}

export function getCurrentLearningPathTopic(params: {
  trackId: string;
  completedTopicIds?: string[];
}): CurriculumTopic | null {
  return (
    buildLearningPathView({
      trackId: params.trackId,
      completedTopicIds: params.completedTopicIds,
    })?.currentTopic ?? null
  );
}