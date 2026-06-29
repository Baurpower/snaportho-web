export type StudentWorkspaceProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  med_school_year: string | null;
  target_specialty: string | null;
  timezone: string | null;
  expected_graduation_year: number | null;
  fourth_year_start_date: string | null;
  fourth_year_end_date: string | null;
  onboarding_completed: boolean;
  onboarding_step: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceProfileInsert = {
  user_id: string;
  display_name?: string | null;
  med_school_year?: string | null;
  target_specialty?: string | null;
  timezone?: string | null;
  expected_graduation_year?: number | null;
  fourth_year_start_date?: string | null;
  fourth_year_end_date?: string | null;
  onboarding_completed?: boolean;
  onboarding_step?: string | null;
  last_opened_at?: string | null;
};

export type StudentWorkspaceProfileUpdate = Partial<
  Omit<StudentWorkspaceProfileInsert, "user_id">
>;

export type StudentWorkspaceRotation = {
  id: string;
  user_id: string;
  title: string;
  institution: string | null;
  service: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  sort_order: number;
  notes: string | null;
  is_away_rotation: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceRotationInsert = {
  user_id: string;
  title: string;
  institution?: string | null;
  service?: string | null;
  location?: string | null;
  start_date: string;
  end_date: string;
  notes?: string | null;
  is_away_rotation?: boolean;
};

export type StudentWorkspaceRotationUpdate = {
  title?: string | null;
  institution?: string | null;
  service?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  is_away_rotation?: boolean;
};

export type FourthYearProgressState = {
  configured: boolean;
  status: "not_configured" | "not_started" | "in_progress" | "completed";
  percentComplete: number;
  totalDays: number | null;
  elapsedDays: number | null;
  remainingDays: number | null;
  orthoDaysRemaining: number | null;
  daysUntilNextRotation: number | null;
  daysUntilNextBreak: number | null;
  currentRotation: StudentWorkspaceRotation | null;
  nextRotation: StudentWorkspaceRotation | null;
  nextBreakRotation: StudentWorkspaceRotation | null;
  currentRotationIndex: number | null;
  rotationCount: number;
  hasOverlapConflict: boolean;
};

export type StudentWorkspaceRotationFormValues = {
  title: string;
  institution: string;
  service: string;
  location: string;
  start_date: string;
  end_date: string;
  notes: string;
  is_away_rotation: boolean;
};

export const STUDENT_WORKSPACE_SCHEDULE_ENTRY_TYPES = [
  "rotation",
  "clinic",
  "or",
  "call",
  "conference",
  "study",
  "research",
  "interview",
  "away_rotation",
  "personal",
  "off",
  "other",
] as const;

export type StudentWorkspaceScheduleEntryType =
  (typeof STUDENT_WORKSPACE_SCHEDULE_ENTRY_TYPES)[number];

export const STUDENT_WORKSPACE_BROBOT_ACTIONS = [
  "Prepare me",
  "Quiz me",
  "Review anatomy",
  "Practice pimp questions",
  "Generate study plan",
  "Review tomorrow’s cases",
  "Launch Deep Dive",
  "Launch Don't Look Stupid",
] as const;

export type StudentWorkspaceBrobotAction =
  (typeof STUDENT_WORKSPACE_BROBOT_ACTIONS)[number];

export type StudentWorkspaceScheduleEntry = {
  id: string;
  user_id: string;
  title: string;
  entry_type: StudentWorkspaceScheduleEntryType;
  location: string | null;
  notes: string | null;
  today_focus: string | null;
  cases_to_review: string | null;
  preparation_workflow: string | null;
  resources: string | null;
  tomorrow_prep: string | null;
  brobot_action: StudentWorkspaceBrobotAction | null;
  weekday: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  rotation_id: string | null;
  is_all_day: boolean;
  color_token: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceScheduleEntryInsert = {
  user_id: string;
  title: string;
  entry_type: StudentWorkspaceScheduleEntryType;
  location?: string | null;
  notes?: string | null;
  today_focus?: string | null;
  cases_to_review?: string | null;
  preparation_workflow?: string | null;
  resources?: string | null;
  tomorrow_prep?: string | null;
  brobot_action?: StudentWorkspaceBrobotAction | null;
  weekday?: number | null;
  specific_date?: string | null;
  start_time: string;
  end_time: string;
  rotation_id?: string | null;
  is_all_day?: boolean;
  color_token?: string | null;
};

export type StudentWorkspaceScheduleEntryUpdate = {
  title?: string | null;
  entry_type?: StudentWorkspaceScheduleEntryType;
  location?: string | null;
  notes?: string | null;
  today_focus?: string | null;
  cases_to_review?: string | null;
  preparation_workflow?: string | null;
  resources?: string | null;
  tomorrow_prep?: string | null;
  brobot_action?: StudentWorkspaceBrobotAction | null;
  weekday?: number | null;
  specific_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  rotation_id?: string | null;
  is_all_day?: boolean;
  color_token?: string | null;
};

export type StudentWorkspaceResolvedScheduleEntry = StudentWorkspaceScheduleEntry & {
  occurs_on: string;
};

export const STUDENT_WORKSPACE_CHECKLIST_TEMPLATE_SCOPES = [
  "daily",
  "rotation",
  "away_rotation",
] as const;

export type StudentWorkspaceChecklistTemplateScope =
  (typeof STUDENT_WORKSPACE_CHECKLIST_TEMPLATE_SCOPES)[number];

export type StudentWorkspaceChecklistTemplate = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  template_scope: StudentWorkspaceChecklistTemplateScope;
  rotation_id: string | null;
  is_default: boolean;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceChecklistTemplateInsert = {
  user_id: string;
  title: string;
  description?: string | null;
  template_scope: StudentWorkspaceChecklistTemplateScope;
  rotation_id?: string | null;
  is_default?: boolean;
};

export type StudentWorkspaceChecklistTemplateUpdate = {
  title?: string | null;
  description?: string | null;
  template_scope?: StudentWorkspaceChecklistTemplateScope;
  rotation_id?: string | null;
  is_default?: boolean;
  archived_at?: string | null;
};

export type StudentWorkspaceChecklistItem = {
  id: string;
  user_id: string;
  template_id: string;
  label: string;
  details: string | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceChecklistItemInsert = {
  user_id: string;
  template_id: string;
  label: string;
  details?: string | null;
  is_required?: boolean;
};

export type StudentWorkspaceChecklistItemUpdate = {
  label?: string | null;
  details?: string | null;
  is_required?: boolean;
};

export type StudentWorkspaceChecklistState = {
  id: string;
  user_id: string;
  checklist_item_id: string;
  state_date: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceChecklistStateUpsert = {
  checklist_item_id: string;
  state_date: string;
  is_completed: boolean;
  notes?: string | null;
};

export type StudentWorkspaceChecklistTemplateWithItems =
  StudentWorkspaceChecklistTemplate & {
    items: StudentWorkspaceChecklistItem[];
  };

export const STUDENT_WORKSPACE_TASK_STATUSES = [
  "open",
  "done",
  "archived",
] as const;

export const STUDENT_WORKSPACE_TASK_PRIORITIES = [
  "low",
  "normal",
  "high",
] as const;

export type StudentWorkspaceTaskStatus =
  (typeof STUDENT_WORKSPACE_TASK_STATUSES)[number];

export type StudentWorkspaceTaskPriority =
  (typeof STUDENT_WORKSPACE_TASK_PRIORITIES)[number];

export type StudentWorkspaceTask = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  status: StudentWorkspaceTaskStatus;
  priority: StudentWorkspaceTaskPriority;
  due_date: string | null;
  rotation_id: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StudentWorkspaceTaskInsert = {
  user_id: string;
  title: string;
  notes?: string | null;
  status?: StudentWorkspaceTaskStatus;
  priority?: StudentWorkspaceTaskPriority;
  due_date?: string | null;
  rotation_id?: string | null;
};

export type StudentWorkspaceTaskUpdate = {
  title?: string | null;
  notes?: string | null;
  status?: StudentWorkspaceTaskStatus;
  priority?: StudentWorkspaceTaskPriority;
  due_date?: string | null;
  rotation_id?: string | null;
};

export type StudentWorkspaceTaskFormValues = {
  title: string;
  notes: string;
  priority: StudentWorkspaceTaskPriority;
  due_date: string;
  rotation_id: string;
};
