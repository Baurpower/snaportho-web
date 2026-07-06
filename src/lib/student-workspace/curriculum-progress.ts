import { createClient } from "@/utils/supabase/server";

export const CURRICULUM_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export type CurriculumProgressStatus =
  (typeof CURRICULUM_PROGRESS_STATUSES)[number];

export type StudentWorkspaceCurriculumProgress = {
  id: string;
  user_id: string;
  topic_id: string;
  track_id: string;
  status: CurriculumProgressStatus;
  study_mode: "fast" | "deep" | null;
  selected_minutes: number | null;
  completed_objective_ids: string[];
  brobot_sessions_count: number;
  caseprep_sessions_count: number;
  last_session_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceLearningPathState = {
  id: string;
  user_id: string;
  track_id: string;
  current_topic_id: string | null;
  current_week: number;
  completed_topic_ids: string[];
  weekly_goal_topic_ids: string[];
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspacePrepareProgressSnapshot = {
  topicProgress: StudentWorkspaceCurriculumProgress[];
  learningPathStates: StudentWorkspaceLearningPathState[];
  completedTopicIds: string[];
};

function normalizeObjectiveIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapTopicProgressRow(
  row: Record<string, unknown>
): StudentWorkspaceCurriculumProgress {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    topic_id: String(row.topic_id),
    track_id: String(row.track_id),
    status: row.status as CurriculumProgressStatus,
    study_mode: (row.study_mode as "fast" | "deep" | null) ?? null,
    selected_minutes:
      typeof row.selected_minutes === "number" ? row.selected_minutes : null,
    completed_objective_ids: normalizeObjectiveIds(row.completed_objective_ids),
    brobot_sessions_count:
      typeof row.brobot_sessions_count === "number"
        ? row.brobot_sessions_count
        : 0,
    caseprep_sessions_count:
      typeof row.caseprep_sessions_count === "number"
        ? row.caseprep_sessions_count
        : 0,
    last_session_at:
      typeof row.last_session_at === "string" ? row.last_session_at : null,
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapLearningPathRow(
  row: Record<string, unknown>
): StudentWorkspaceLearningPathState {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    track_id: String(row.track_id),
    current_topic_id:
      typeof row.current_topic_id === "string" ? row.current_topic_id : null,
    current_week:
      typeof row.current_week === "number" && row.current_week > 0
        ? row.current_week
        : 1,
    completed_topic_ids: normalizeObjectiveIds(row.completed_topic_ids),
    weekly_goal_topic_ids: normalizeObjectiveIds(row.weekly_goal_topic_ids),
    last_studied_at:
      typeof row.last_studied_at === "string" ? row.last_studied_at : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getStudentWorkspacePrepareProgressSnapshot(
  userId: string
): Promise<StudentWorkspacePrepareProgressSnapshot> {
  const supabase = await createClient();
  const [topicResult, pathResult] = await Promise.all([
    supabase
      .from("student_workspace_curriculum_progress")
      .select("*")
      .eq("user_id", userId)
      .order("last_session_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("student_workspace_learning_path_state")
      .select("*")
      .eq("user_id", userId),
  ]);

  if (topicResult.error) {
    throw new Error(topicResult.error.message);
  }
  if (pathResult.error) {
    throw new Error(pathResult.error.message);
  }

  const topicProgress = (topicResult.data ?? []).map((row) =>
    mapTopicProgressRow(row as Record<string, unknown>)
  );

  return {
    topicProgress,
    learningPathStates: (pathResult.data ?? []).map((row) =>
      mapLearningPathRow(row as Record<string, unknown>)
    ),
    completedTopicIds: topicProgress
      .filter((entry) => entry.status === "completed")
      .map((entry) => entry.topic_id),
  };
}

export async function getTopicCurriculumProgress(
  userId: string,
  topicId: string
): Promise<StudentWorkspaceCurriculumProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_curriculum_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapTopicProgressRow(data as Record<string, unknown>);
}

export type UpsertCurriculumProgressInput = {
  topicId: string;
  trackId: string;
  status?: CurriculumProgressStatus;
  studyMode?: "fast" | "deep";
  selectedMinutes?: number;
  completedObjectiveIds?: string[];
  incrementBrobotSessions?: boolean;
  incrementCaseprepSessions?: boolean;
};

function deriveStatus(
  completedObjectiveIds: string[],
  totalObjectives: number,
  requested?: CurriculumProgressStatus
): CurriculumProgressStatus {
  if (requested) return requested;
  if (totalObjectives > 0 && completedObjectiveIds.length >= totalObjectives) {
    return "completed";
  }
  if (completedObjectiveIds.length > 0) return "in_progress";
  return "not_started";
}

export async function upsertCurriculumProgress(
  userId: string,
  input: UpsertCurriculumProgressInput,
  options?: { totalObjectives?: number }
): Promise<StudentWorkspaceCurriculumProgress> {
  const supabase = await createClient();
  const existing = await getTopicCurriculumProgress(userId, input.topicId);
  const completedObjectiveIds =
    input.completedObjectiveIds ?? existing?.completed_objective_ids ?? [];
  const status = deriveStatus(
    completedObjectiveIds,
    options?.totalObjectives ?? 0,
    input.status
  );
  const now = new Date().toISOString();

  const payload = {
    user_id: userId,
    topic_id: input.topicId,
    track_id: input.trackId,
    status,
    study_mode: input.studyMode ?? existing?.study_mode ?? null,
    selected_minutes:
      input.selectedMinutes ?? existing?.selected_minutes ?? null,
    completed_objective_ids: completedObjectiveIds,
    brobot_sessions_count:
      (existing?.brobot_sessions_count ?? 0) +
      (input.incrementBrobotSessions ? 1 : 0),
    caseprep_sessions_count:
      (existing?.caseprep_sessions_count ?? 0) +
      (input.incrementCaseprepSessions ? 1 : 0),
    last_session_at: now,
    completed_at: status === "completed" ? now : existing?.completed_at ?? null,
  };

  const { data, error } = await supabase
    .from("student_workspace_curriculum_progress")
    .upsert(payload, { onConflict: "user_id,topic_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapTopicProgressRow(data as Record<string, unknown>);
}

export async function upsertLearningPathState(
  userId: string,
  input: {
    trackId: string;
    currentTopicId?: string | null;
    currentWeek?: number;
    completedTopicIds?: string[];
    weeklyGoalTopicIds?: string[];
  }
): Promise<StudentWorkspaceLearningPathState> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("student_workspace_learning_path_state")
    .select("*")
    .eq("user_id", userId)
    .eq("track_id", input.trackId)
    .maybeSingle();

  const existingRow = existing
    ? mapLearningPathRow(existing as Record<string, unknown>)
    : null;

  const payload = {
    user_id: userId,
    track_id: input.trackId,
    current_topic_id:
      input.currentTopicId !== undefined
        ? input.currentTopicId
        : existingRow?.current_topic_id ?? null,
    current_week: input.currentWeek ?? existingRow?.current_week ?? 1,
    completed_topic_ids:
      input.completedTopicIds ?? existingRow?.completed_topic_ids ?? [],
    weekly_goal_topic_ids:
      input.weeklyGoalTopicIds ?? existingRow?.weekly_goal_topic_ids ?? [],
    last_studied_at: now,
  };

  const { data, error } = await supabase
    .from("student_workspace_learning_path_state")
    .upsert(payload, { onConflict: "user_id,track_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapLearningPathRow(data as Record<string, unknown>);
}