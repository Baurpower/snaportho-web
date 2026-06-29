import { createClient } from "@/utils/supabase/server";
import { isValidDateOnlyString } from "@/lib/student-workspace/date";
import { getStudentWorkspaceRotationById } from "@/lib/student-workspace/rotations";
import {
  STUDENT_WORKSPACE_TASK_PRIORITIES,
  STUDENT_WORKSPACE_TASK_STATUSES,
  type StudentWorkspaceTask,
  type StudentWorkspaceTaskInsert,
  type StudentWorkspaceTaskPriority,
  type StudentWorkspaceTaskStatus,
  type StudentWorkspaceTaskUpdate,
} from "@/lib/student-workspace/types";

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireTitle(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("Task title is required.");
  }
  return trimmed;
}

function requireStatus(value: unknown): StudentWorkspaceTaskStatus {
  if (
    typeof value !== "string" ||
    !STUDENT_WORKSPACE_TASK_STATUSES.includes(value as StudentWorkspaceTaskStatus)
  ) {
    throw new Error("Task status is invalid.");
  }
  return value as StudentWorkspaceTaskStatus;
}

function requirePriority(value: unknown): StudentWorkspaceTaskPriority {
  if (
    typeof value !== "string" ||
    !STUDENT_WORKSPACE_TASK_PRIORITIES.includes(
      value as StudentWorkspaceTaskPriority
    )
  ) {
    throw new Error("Task priority is invalid.");
  }
  return value as StudentWorkspaceTaskPriority;
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

async function assertOwnedRotation(userId: string, rotationId: string | null | undefined) {
  if (!rotationId) return null;
  const rotation = await getStudentWorkspaceRotationById(userId, rotationId);
  if (!rotation) {
    throw new Error("Referenced rotation was not found.");
  }
  return rotation.id;
}

async function renormalizeTaskOrder(userId: string, status: StudentWorkspaceTaskStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  await Promise.all(
    ((data ?? []) as StudentWorkspaceTask[]).map(async (task, index) => {
      if (task.sort_order === index) return;
      const { error: updateError } = await supabase
        .from("student_workspace_tasks")
        .update({ sort_order: index })
        .eq("user_id", userId)
        .eq("id", task.id);
      if (updateError) throw new Error(updateError.message);
    })
  );
}

export async function getStudentWorkspaceTasks(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudentWorkspaceTask[];
}

export async function createStudentWorkspaceTask(
  userId: string,
  input: Partial<Omit<StudentWorkspaceTaskInsert, "user_id">>
) {
  const supabase = await createClient();
  const status = input.status ? requireStatus(input.status) : "open";
  const priority = input.priority ? requirePriority(input.priority) : "normal";
  const dueDate = normalizeOptionalDate(input.due_date);
  const rotationId = await assertOwnedRotation(userId, input.rotation_id);

  const { data: lastTask, error: lastTaskError } = await supabase
    .from("student_workspace_tasks")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("status", status)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTaskError) throw new Error(lastTaskError.message);

  const payload = {
    user_id: userId,
    title: requireTitle(input.title),
    notes: normalizeString(input.notes),
    status,
    priority,
    due_date: dueDate ?? null,
    rotation_id: rotationId,
    completed_at: status === "done" ? new Date().toISOString() : null,
    sort_order: (lastTask?.sort_order ?? -1) + 1,
  };

  const { data, error } = await supabase
    .from("student_workspace_tasks")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceTask;
}

export async function getStudentWorkspaceTaskById(userId: string, taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as StudentWorkspaceTask | null;
}

export async function updateStudentWorkspaceTask(
  userId: string,
  taskId: string,
  updates: StudentWorkspaceTaskUpdate
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceTaskById(userId, taskId);
  if (!existing) throw new Error("Task not found.");

  const nextStatus =
    updates.status === undefined ? existing.status : requireStatus(updates.status);
  const nextPriority =
    updates.priority === undefined
      ? existing.priority
      : requirePriority(updates.priority);
  const dueDate =
    updates.due_date === undefined
      ? undefined
      : normalizeOptionalDate(updates.due_date);
  const rotationId =
    updates.rotation_id === undefined
      ? existing.rotation_id
      : await assertOwnedRotation(userId, updates.rotation_id);

  const payload = {
    title: updates.title === undefined ? undefined : requireTitle(updates.title),
    notes: updates.notes === undefined ? undefined : normalizeString(updates.notes),
    status: updates.status === undefined ? undefined : nextStatus,
    priority: updates.priority === undefined ? undefined : nextPriority,
    due_date: updates.due_date === undefined ? undefined : dueDate,
    rotation_id: updates.rotation_id === undefined ? undefined : rotationId,
    completed_at:
      updates.status === undefined
        ? undefined
        : nextStatus === "done"
          ? existing.completed_at ?? new Date().toISOString()
          : null,
  };

  const { data, error } = await supabase
    .from("student_workspace_tasks")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (existing.status !== nextStatus) {
    await renormalizeTaskOrder(userId, existing.status);
  }

  return data as StudentWorkspaceTask;
}

export async function deleteStudentWorkspaceTask(userId: string, taskId: string) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceTaskById(userId, taskId);
  if (!existing) throw new Error("Task not found.");

  const { error } = await supabase
    .from("student_workspace_tasks")
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  await renormalizeTaskOrder(userId, existing.status);
  return true;
}
