import type { CurriculumTrackFilterId } from "@/components/student-workspace/prepare/rotation-track-mapping";
import { buildRotationPrepProfile } from "@/lib/student-curriculum/rotation-prep-profile";
import {
  getCurrentLearningPathTopic,
  buildLearningPathView,
} from "@/lib/student-curriculum/learning-paths";
import {
  getRecommendedNextTopics,
  getTopicById,
} from "@/lib/student-curriculum/curriculum-recommendations";
import type { StudentWorkspaceResolvedScheduleEntry } from "@/lib/student-workspace/types";
import type { StudentWorkspaceCurriculumProgress } from "@/lib/student-workspace/curriculum-progress";

export type TodaysPrepCardKind =
  | "continue"
  | "cases"
  | "anatomy"
  | "procedures"
  | "oite"
  | "complications"
  | "checklist"
  | "quick_review";

export type TodaysPrepCard = {
  id: string;
  kind: TodaysPrepCardKind;
  title: string;
  description: string;
  topicId?: string;
  href?: string;
  meta?: string;
  priority: number;
};

export function buildTodaysPreparationCards(params: {
  trackId: CurriculumTrackFilterId | null;
  completedTopicIds: string[];
  topicProgress: StudentWorkspaceCurriculumProgress[];
  tomorrowEntry: StudentWorkspaceResolvedScheduleEntry | null;
  scheduleCasesToReview?: string | null;
  scheduleTomorrowPrep?: string | null;
  studyMode: "fast" | "deep";
  selectedMinutes: number;
  inferredTopicId?: string | null;
}): TodaysPrepCard[] {
  const cards: TodaysPrepCard[] = [];
  const profile = params.trackId
    ? buildRotationPrepProfile(params.trackId)
    : null;
  const learningPath = params.trackId
    ? buildLearningPathView({
        trackId: params.trackId,
        completedTopicIds: params.completedTopicIds,
      })
    : null;

  const inProgress = params.topicProgress
    .filter((entry) => entry.status === "in_progress")
    .sort((left, right) => {
      const leftTime = left.last_session_at ?? "";
      const rightTime = right.last_session_at ?? "";
      return rightTime.localeCompare(leftTime);
    })[0];

  const continueTopicId =
    inProgress?.topic_id ??
    learningPath?.currentTopic?.id ??
    params.inferredTopicId ??
    profile?.suggestedStartTopic?.id;

  if (continueTopicId) {
    const topic = getTopicById(continueTopicId);
    cards.push({
      id: "continue",
      kind: "continue",
      title: "Continue where you left off",
      description: topic
        ? `Pick up ${topic.title} and finish your readiness checklist.`
        : "Resume your most recent preparation session.",
      topicId: continueTopicId,
      href: `/student-workspace/case-readiness/${continueTopicId}?mode=${params.studyMode}&time=${params.selectedMinutes}`,
      priority: 100,
    });
  }

  const caseSource =
    params.scheduleCasesToReview?.trim() ||
    params.tomorrowEntry?.title?.trim() ||
    profile?.recommendedCases.slice(0, 2).join(" · ");

  if (caseSource) {
    cards.push({
      id: "cases",
      kind: "cases",
      title: "Cases to review today",
      description: caseSource,
      priority: 95,
    });
  }

  if (profile?.anatomyHighlights.length) {
    const anatomyTopic = profile.highYieldTopics[0];
    cards.push({
      id: "anatomy",
      kind: "anatomy",
      title: "Recommended anatomy",
      description: profile.anatomyHighlights.slice(0, 3).join(" · "),
      topicId: anatomyTopic?.id,
      href: anatomyTopic
        ? `/student-workspace/case-readiness/${anatomyTopic.id}?mode=${params.studyMode}&time=${params.selectedMinutes}`
        : undefined,
      priority: 90,
    });
  }

  if (profile?.commonProcedures.length) {
    const procedureTopic =
      learningPath?.currentTopic ?? profile.highYieldTopics[1] ?? profile.highYieldTopics[0];
    cards.push({
      id: "procedures",
      kind: "procedures",
      title: "Recommended procedures",
      description: profile.commonProcedures.slice(0, 4).join(" · "),
      topicId: procedureTopic?.id,
      href: procedureTopic
        ? `/student-workspace/case-readiness/${procedureTopic.id}?mode=${params.studyMode}&time=${params.selectedMinutes}`
        : undefined,
      priority: 85,
    });
  }

  if (params.trackId === "basic-science" || !params.trackId) {
    const oiteTopic =
      getTopicById("fracture-healing") ?? getCurrentLearningPathTopic({ trackId: "basic-science" });
    if (oiteTopic) {
      cards.push({
        id: "oite",
        kind: "oite",
        title: "High-yield OITE topic",
        description: `Review ${oiteTopic.title} with a focused ${params.selectedMinutes}-minute block.`,
        topicId: oiteTopic.id,
        href: `/student-workspace/case-readiness/${oiteTopic.id}?mode=${params.studyMode}&time=15`,
        priority: 80,
      });
    }
  }

  if (profile?.complicationReview.length) {
    const complicationTopic = profile.highYieldTopics.find((topic) =>
      topic.tags.some((tag) => /complicat|pitfall|infection/i.test(tag))
    ) ?? profile.highYieldTopics[2];
    cards.push({
      id: "complications",
      kind: "complications",
      title: "Common complications",
      description: profile.complicationReview.slice(0, 3).join(" · "),
      topicId: complicationTopic?.id,
      href: complicationTopic
        ? `/student-workspace/case-readiness/${complicationTopic.id}?mode=${params.studyMode}&time=${params.selectedMinutes}`
        : undefined,
      priority: 75,
    });
  }

  const nextRecommendation = getRecommendedNextTopics({
    trackId: params.trackId ?? undefined,
    completedTopicIds: params.completedTopicIds,
    limit: 1,
  })[0];

  if (params.scheduleTomorrowPrep?.trim()) {
    cards.push({
      id: "checklist",
      kind: "checklist",
      title: "Resident checklist",
      description: params.scheduleTomorrowPrep.trim(),
      priority: 70,
    });
  } else if (nextRecommendation) {
    cards.push({
      id: "checklist",
      kind: "checklist",
      title: "Resident checklist",
      description: `Before tomorrow: complete ${nextRecommendation.topic.title} and be ready to explain the core decision points.`,
      topicId: nextRecommendation.topic.id,
      href: `/student-workspace/case-readiness/${nextRecommendation.topic.id}?mode=${params.studyMode}&time=${params.selectedMinutes}`,
      priority: 70,
    });
  }

  const quickTopic =
    profile?.suggestedStartTopic ??
    nextRecommendation?.topic ??
    learningPath?.currentTopic;
  if (quickTopic) {
    cards.push({
      id: "quick_review",
      kind: "quick_review",
      title: "Five-minute review",
      description: `Fast pass on ${quickTopic.title}: one-liner, anatomy, and the first attending question.`,
      topicId: quickTopic.id,
      href: `/student-workspace/case-readiness/${quickTopic.id}?mode=fast&time=5`,
      meta: "5 min",
      priority: 65,
    });
  }

  return cards.sort((left, right) => right.priority - left.priority);
}