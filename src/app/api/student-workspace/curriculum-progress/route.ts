import { NextRequest, NextResponse } from "next/server";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import {
  getStudentWorkspacePrepareProgressSnapshot,
  upsertCurriculumProgress,
  upsertLearningPathState,
} from "@/lib/student-workspace/curriculum-progress";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";

export async function GET() {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const snapshot = await getStudentWorkspacePrepareProgressSnapshot(auth.user.id);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load curriculum progress",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<{
      topicId?: string;
      trackId?: string;
      status?: "not_started" | "in_progress" | "completed";
      studyMode?: "fast" | "deep";
      selectedMinutes?: number;
      completedObjectiveIds?: string[];
      totalObjectives?: number;
      incrementBrobotSessions?: boolean;
      incrementCaseprepSessions?: boolean;
      learningPath?: {
        trackId: string;
        currentTopicId?: string | null;
        currentWeek?: number;
        completedTopicIds?: string[];
        weeklyGoalTopicIds?: string[];
      };
    }>(request);

    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    if (!body.topicId || !body.trackId) {
      return NextResponse.json(
        { error: "topicId and trackId are required." },
        { status: 400 }
      );
    }

    const progress = await upsertCurriculumProgress(
      auth.user.id,
      {
        topicId: body.topicId,
        trackId: body.trackId,
        status: body.status,
        studyMode: body.studyMode,
        selectedMinutes: body.selectedMinutes,
        completedObjectiveIds: body.completedObjectiveIds,
        incrementBrobotSessions: body.incrementBrobotSessions,
        incrementCaseprepSessions: body.incrementCaseprepSessions,
      },
      { totalObjectives: body.totalObjectives }
    );

    const learningPathState = body.learningPath
      ? await upsertLearningPathState(auth.user.id, body.learningPath)
      : null;

    return NextResponse.json({ progress, learningPathState });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update curriculum progress",
      },
      { status: 500 }
    );
  }
}