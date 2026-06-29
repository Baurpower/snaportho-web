import { createClient } from "@/utils/supabase/server";
import {
  compareDateOnly,
  getDatesForWeek,
  isValidDateOnlyString,
  isValidTimeString,
  normalizeTimeString,
} from "@/lib/student-workspace/date";
import { getStudentWorkspaceRotationById } from "@/lib/student-workspace/rotations";
import { resolveScheduleEntriesForWeek } from "@/lib/student-workspace/schedule-resolver";
import type {
  StudentWorkspaceBrobotAction,
  StudentWorkspaceScheduleEntry,
  StudentWorkspaceScheduleEntryInsert,
  StudentWorkspaceScheduleEntryType,
  StudentWorkspaceScheduleEntryUpdate,
} from "@/lib/student-workspace/types";
import {
  STUDENT_WORKSPACE_BROBOT_ACTIONS,
  STUDENT_WORKSPACE_SCHEDULE_ENTRY_TYPES,
} from "@/lib/student-workspace/types";

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireTitle(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("Schedule entry title is required.");
  }
  return trimmed;
}

function requireEntryType(value: unknown): StudentWorkspaceScheduleEntryType {
  if (
    typeof value !== "string" ||
    !STUDENT_WORKSPACE_SCHEDULE_ENTRY_TYPES.includes(
      value as StudentWorkspaceScheduleEntryType
    )
  ) {
    throw new Error("Schedule entry type is invalid.");
  }

  return value as StudentWorkspaceScheduleEntryType;
}

function normalizeBrobotAction(
  value: string | null | undefined
): StudentWorkspaceBrobotAction | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  if (
    !STUDENT_WORKSPACE_BROBOT_ACTIONS.includes(
      normalized as StudentWorkspaceBrobotAction
    )
  ) {
    throw new Error("BroBot action is invalid.");
  }

  return normalized as StudentWorkspaceBrobotAction;
}

function normalizeOptionalDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidDateOnlyString(trimmed)) {
    throw new Error("Dates must use valid YYYY-MM-DD format.");
  }
  return trimmed;
}

function normalizeOptionalWeekday(value: number | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    throw new Error("weekday must be an integer between 0 and 6.");
  }
  return value;
}

function requireTime(value: string | null | undefined, fieldLabel: string) {
  if (!value?.trim()) {
    throw new Error(`${fieldLabel} is required.`);
  }
  if (!isValidTimeString(value.trim())) {
    throw new Error(`${fieldLabel} must use valid HH:MM format.`);
  }
  return normalizeTimeString(value.trim());
}

function normalizeOptionalBoolean(value: boolean | undefined, fallback = false) {
  return value === undefined ? fallback : value;
}

function validateDateSelector(
  weekday: number | null | undefined,
  specificDate: string | null | undefined
) {
  const hasWeekday = weekday !== null && weekday !== undefined;
  const hasSpecificDate = !!specificDate;
  if (hasWeekday === hasSpecificDate) {
    throw new Error("Schedule entries must have either weekday or specific_date.");
  }
}

function validateTimeRange(startTime: string, endTime: string, isAllDay: boolean) {
  if (isAllDay) return;
  if (startTime >= endTime) {
    throw new Error("Schedule entry end time must be after start time.");
  }
}

async function assertOwnedRotation(userId: string, rotationId: string | null | undefined) {
  if (!rotationId) return null;

  const rotation = await getStudentWorkspaceRotationById(userId, rotationId);
  if (!rotation) {
    throw new Error("Referenced rotation was not found.");
  }

  return rotation.id;
}

function sortScheduleEntries(entries: StudentWorkspaceScheduleEntry[]) {
  return [...entries].sort((left, right) => {
    const leftDay = left.specific_date ?? `${left.weekday ?? 0}`;
    const rightDay = right.specific_date ?? `${right.weekday ?? 0}`;
    if (leftDay !== rightDay) {
      return leftDay.localeCompare(rightDay);
    }
    if (left.is_all_day !== right.is_all_day) {
      return left.is_all_day ? -1 : 1;
    }
    if (left.start_time !== right.start_time) {
      return left.start_time.localeCompare(right.start_time);
    }
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

async function listScheduleEntriesForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_schedule_entries")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("start_time", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudentWorkspaceScheduleEntry[];
}

export async function getStudentWorkspaceScheduleEntriesForWeek(
  userId: string,
  weekStart: string
) {
  if (!isValidDateOnlyString(weekStart)) {
    throw new Error("week_start must use valid YYYY-MM-DD format.");
  }

  const weekDates = getDatesForWeek(weekStart);
  const weekEnd = weekDates[6];
  const entries = await listScheduleEntriesForUser(userId);

  return sortScheduleEntries(
    entries.filter((entry) => {
      if (entry.specific_date) {
        return (
          compareDateOnly(entry.specific_date, weekStart) >= 0 &&
          compareDateOnly(entry.specific_date, weekEnd) <= 0
        );
      }

      return entry.weekday !== null;
    })
  );
}

export { resolveScheduleEntriesForWeek };

export async function createStudentWorkspaceScheduleEntry(
  userId: string,
  input: Partial<Omit<StudentWorkspaceScheduleEntryInsert, "user_id">>
) {
  const supabase = await createClient();
  const title = requireTitle(input.title);
  const entryType = requireEntryType(input.entry_type);
  const weekday = normalizeOptionalWeekday(input.weekday);
  const specificDate = normalizeOptionalDate(input.specific_date);
  validateDateSelector(weekday, specificDate);
  const startTime = requireTime(input.start_time, "start_time");
  const endTime = requireTime(input.end_time, "end_time");
  const isAllDay = normalizeOptionalBoolean(input.is_all_day);
  validateTimeRange(startTime, endTime, isAllDay);
  const rotationId = await assertOwnedRotation(userId, input.rotation_id);

  const { data: lastEntry, error: lastEntryError } = await supabase
    .from("student_workspace_schedule_entries")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEntryError) throw new Error(lastEntryError.message);

  const payload = {
    user_id: userId,
    title,
    entry_type: entryType,
    location: normalizeString(input.location),
    notes: normalizeString(input.notes),
    today_focus: normalizeString(input.today_focus),
    cases_to_review: normalizeString(input.cases_to_review),
    preparation_workflow: normalizeString(input.preparation_workflow),
    resources: normalizeString(input.resources),
    tomorrow_prep: normalizeString(input.tomorrow_prep),
    brobot_action: normalizeBrobotAction(input.brobot_action),
    weekday: weekday ?? null,
    specific_date: specificDate ?? null,
    start_time: startTime,
    end_time: endTime,
    rotation_id: rotationId,
    is_all_day: isAllDay,
    color_token: normalizeString(input.color_token),
    sort_order: (lastEntry?.sort_order ?? -1) + 1,
  };

  const { data, error } = await supabase
    .from("student_workspace_schedule_entries")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceScheduleEntry;
}

export async function getStudentWorkspaceScheduleEntryById(
  userId: string,
  entryId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_schedule_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as StudentWorkspaceScheduleEntry | null;
}

export async function updateStudentWorkspaceScheduleEntry(
  userId: string,
  entryId: string,
  updates: StudentWorkspaceScheduleEntryUpdate
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceScheduleEntryById(userId, entryId);
  if (!existing) throw new Error("Schedule entry not found.");

  const weekday =
    updates.weekday === undefined ? undefined : normalizeOptionalWeekday(updates.weekday);
  const specificDate =
    updates.specific_date === undefined
      ? undefined
      : normalizeOptionalDate(updates.specific_date);
  const effectiveWeekday = weekday === undefined ? existing.weekday : weekday;
  const effectiveSpecificDate =
    specificDate === undefined ? existing.specific_date : specificDate;
  validateDateSelector(effectiveWeekday, effectiveSpecificDate);

  const startTime =
    updates.start_time === undefined
      ? existing.start_time.slice(0, 5)
      : requireTime(updates.start_time, "start_time");
  const endTime =
    updates.end_time === undefined
      ? existing.end_time.slice(0, 5)
      : requireTime(updates.end_time, "end_time");
  const isAllDay =
    updates.is_all_day === undefined ? existing.is_all_day : updates.is_all_day;
  validateTimeRange(startTime, endTime, isAllDay);
  const rotationId =
    updates.rotation_id === undefined
      ? existing.rotation_id
      : await assertOwnedRotation(userId, updates.rotation_id);

  const payload = {
    title: updates.title === undefined ? undefined : requireTitle(updates.title),
    entry_type:
      updates.entry_type === undefined
        ? undefined
        : requireEntryType(updates.entry_type),
    location:
      updates.location === undefined ? undefined : normalizeString(updates.location),
    notes: updates.notes === undefined ? undefined : normalizeString(updates.notes),
    today_focus:
      updates.today_focus === undefined
        ? undefined
        : normalizeString(updates.today_focus),
    cases_to_review:
      updates.cases_to_review === undefined
        ? undefined
        : normalizeString(updates.cases_to_review),
    preparation_workflow:
      updates.preparation_workflow === undefined
        ? undefined
        : normalizeString(updates.preparation_workflow),
    resources:
      updates.resources === undefined
        ? undefined
        : normalizeString(updates.resources),
    tomorrow_prep:
      updates.tomorrow_prep === undefined
        ? undefined
        : normalizeString(updates.tomorrow_prep),
    brobot_action:
      updates.brobot_action === undefined
        ? undefined
        : normalizeBrobotAction(updates.brobot_action),
    weekday: weekday === undefined ? undefined : weekday,
    specific_date: specificDate === undefined ? undefined : specificDate,
    start_time: updates.start_time === undefined ? undefined : startTime,
    end_time: updates.end_time === undefined ? undefined : endTime,
    rotation_id: updates.rotation_id === undefined ? undefined : rotationId,
    is_all_day: updates.is_all_day,
    color_token:
      updates.color_token === undefined
        ? undefined
        : normalizeString(updates.color_token),
  };

  const { data, error } = await supabase
    .from("student_workspace_schedule_entries")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceScheduleEntry;
}

export async function deleteStudentWorkspaceScheduleEntry(
  userId: string,
  entryId: string
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceScheduleEntryById(userId, entryId);
  if (!existing) throw new Error("Schedule entry not found.");

  const { error } = await supabase
    .from("student_workspace_schedule_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  return true;
}
