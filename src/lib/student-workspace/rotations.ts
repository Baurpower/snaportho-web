import { createClient } from "@/utils/supabase/server";
import { compareDateOnly, isValidDateOnlyString } from "@/lib/student-workspace/date";
import type {
  StudentWorkspaceRotation,
  StudentWorkspaceRotationInsert,
  StudentWorkspaceRotationUpdate,
} from "@/lib/student-workspace/types";

type RotationRecord = StudentWorkspaceRotation;

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireTitle(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("Rotation title is required.");
  }

  return trimmed;
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

function requireDate(value: string | null | undefined, fieldLabel: string) {
  const normalized = normalizeOptionalDate(value);
  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
}

function normalizeBoolean(value: boolean | undefined, fallback = false) {
  return value === undefined ? fallback : value;
}

function validateDateRange(startDate: string, endDate: string) {
  if (compareDateOnly(endDate, startDate) < 0) {
    throw new Error("Rotation end date cannot be earlier than the start date.");
  }
}

async function listRotationsForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_rotations")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RotationRecord[];
}

export async function getStudentWorkspaceRotations(userId: string) {
  return listRotationsForUser(userId);
}

export async function getStudentWorkspaceRotationById(
  userId: string,
  rotationId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_rotations")
    .select("*")
    .eq("user_id", userId)
    .eq("id", rotationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as RotationRecord | null;
}

async function renormalizeStudentWorkspaceRotationOrder(userId: string) {
  const supabase = await createClient();
  const rotations = await listRotationsForUser(userId);

  await Promise.all(
    rotations.map(async (rotation, index) => {
      if (rotation.sort_order === index) {
        return;
      }

      const { error } = await supabase
        .from("student_workspace_rotations")
        .update({ sort_order: index })
        .eq("user_id", userId)
        .eq("id", rotation.id);

      if (error) {
        throw new Error(error.message);
      }
    })
  );

  return listRotationsForUser(userId);
}

export async function createStudentWorkspaceRotation(
  userId: string,
  input: Partial<Omit<StudentWorkspaceRotationInsert, "user_id">>
) {
  const supabase = await createClient();
  const title = requireTitle(input.title);
  const startDate = requireDate(input.start_date, "Start date");
  const endDate = requireDate(input.end_date, "End date");
  validateDateRange(startDate, endDate);

  const { data: lastRotation, error: lastRotationError } = await supabase
    .from("student_workspace_rotations")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRotationError) {
    throw new Error(lastRotationError.message);
  }

  const payload = {
    user_id: userId,
    title,
    institution: normalizeString(input.institution),
    service: normalizeString(input.service),
    location: normalizeString(input.location),
    start_date: startDate,
    end_date: endDate,
    sort_order: (lastRotation?.sort_order ?? -1) + 1,
    notes: normalizeString(input.notes),
    is_away_rotation: normalizeBoolean(input.is_away_rotation),
  };

  const { data, error } = await supabase
    .from("student_workspace_rotations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as RotationRecord;
}

export async function updateStudentWorkspaceRotation(
  userId: string,
  rotationId: string,
  updates: StudentWorkspaceRotationUpdate
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceRotationById(userId, rotationId);

  if (!existing) {
    throw new Error("Rotation not found.");
  }

  const nextStartDate =
    updates.start_date === undefined
      ? undefined
      : requireDate(updates.start_date, "Start date");
  const nextEndDate =
    updates.end_date === undefined ? undefined : requireDate(updates.end_date, "End date");
  const effectiveStartDate =
    nextStartDate === undefined ? existing.start_date : nextStartDate;
  const effectiveEndDate = nextEndDate === undefined ? existing.end_date : nextEndDate;
  validateDateRange(effectiveStartDate, effectiveEndDate);

  const payload = {
    title: updates.title === undefined ? undefined : requireTitle(updates.title),
    institution:
      updates.institution === undefined
        ? undefined
        : normalizeString(updates.institution),
    service:
      updates.service === undefined ? undefined : normalizeString(updates.service),
    location:
      updates.location === undefined
        ? undefined
        : normalizeString(updates.location),
    start_date: nextStartDate ?? undefined,
    end_date: nextEndDate ?? undefined,
    notes: updates.notes === undefined ? undefined : normalizeString(updates.notes),
    is_away_rotation:
      updates.is_away_rotation === undefined
        ? undefined
        : updates.is_away_rotation,
  };

  const { data, error } = await supabase
    .from("student_workspace_rotations")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", rotationId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as RotationRecord;
}

export async function deleteStudentWorkspaceRotation(
  userId: string,
  rotationId: string
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceRotationById(userId, rotationId);

  if (!existing) {
    throw new Error("Rotation not found.");
  }

  const { error } = await supabase
    .from("student_workspace_rotations")
    .delete()
    .eq("user_id", userId)
    .eq("id", rotationId);

  if (error) {
    throw new Error(error.message);
  }

  return renormalizeStudentWorkspaceRotationOrder(userId);
}

export async function reorderStudentWorkspaceRotations(
  userId: string,
  rotationIds: string[]
) {
  const uniqueIds = new Set(rotationIds);
  if (uniqueIds.size !== rotationIds.length) {
    throw new Error("Rotation reorder payload contains duplicate ids.");
  }

  const existingRotations = await listRotationsForUser(userId);
  if (existingRotations.length === 0 && rotationIds.length === 0) {
    return [];
  }

  if (existingRotations.length !== rotationIds.length) {
    throw new Error("Rotation reorder payload must include every owned rotation.");
  }

  const supabase = await createClient();
  const existingIds = new Set(existingRotations.map((rotation) => rotation.id));
  for (const id of rotationIds) {
    if (!existingIds.has(id)) {
      throw new Error("Rotation reorder payload includes an unknown rotation id.");
    }
  }

  await Promise.all(
    rotationIds.map(async (rotationId, index) => {
      const { error } = await supabase
        .from("student_workspace_rotations")
        .update({ sort_order: index })
        .eq("user_id", userId)
        .eq("id", rotationId);

      if (error) {
        throw new Error(error.message);
      }
    })
  );

  return listRotationsForUser(userId);
}
