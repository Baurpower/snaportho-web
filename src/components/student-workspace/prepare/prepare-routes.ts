import type { StudyMode } from "@/lib/student-curriculum";

export function buildCaseReadinessHref(params: {
  topicId: string;
  mode: StudyMode;
  time: number;
}): string {
  const topicId = params.topicId.trim();
  if (!topicId) {
    return "/student-workspace/prepare";
  }

  const time = Number.isFinite(params.time) && params.time > 0 ? params.time : 15;
  return `/student-workspace/case-readiness/${encodeURIComponent(topicId)}?mode=${params.mode}&time=${time}`;
}