import { createClient } from "@/utils/supabase/server";
import type {
  ProgramAttending,
  ProgramAttendingInput,
  ProgramAttendingMonthPayload,
  ProgramCallAttendingAssignment,
} from "@/lib/workspace/call/types";
import {
  DEFAULT_PROGRAM_ATTENDING_SCOPE,
  getMonthRange,
  type ProgramAttendingMonthAssignmentInput,
} from "@/lib/workspace/call/attendings-shared";

export {
  canManageProgramAttendings,
  DEFAULT_PROGRAM_ATTENDING_SCOPE,
  getMonthRange,
  isValidDateString,
  isValidMonthKey,
  normalizeProgramAttendingInput,
  normalizeProgramAttendingMonthAssignments,
  normalizeProgramScopedRole,
  PROGRAM_ATTENDING_EDITOR_ROLES,
} from "@/lib/workspace/call/attendings-shared";

type ProgramAttendingRow = {
  id: string;
  program_id: string;
  full_name: string;
  display_name: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProgramCallAttendingAssignmentRow = {
  id: string;
  program_id: string;
  attending_id: string;
  coverage_date: string;
  coverage_scope: string;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  program_attendings:
    | {
        id: string;
        full_name: string;
        display_name: string | null;
      }
    | {
        id: string;
        full_name: string;
        display_name: string | null;
      }[]
    | null;
};

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapProgramAttending(row: ProgramAttendingRow): ProgramAttending {
  return {
    id: row.id,
    programId: row.program_id,
    fullName: row.full_name,
    displayName: row.display_name,
    isActive: row.is_active,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProgramCallAttendingAssignment(
  row: ProgramCallAttendingAssignmentRow
): ProgramCallAttendingAssignment {
  const attending = normalizeOne(row.program_attendings);

  return {
    id: row.id,
    programId: row.program_id,
    attendingId: row.attending_id,
    attendingName: attending?.full_name ?? "Unknown Attending",
    attendingDisplayName: attending?.display_name ?? null,
    coverageDate: row.coverage_date,
    coverageScope: row.coverage_scope,
    isDefault: row.is_default,
    isActive: row.is_active,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProgramAttendings(
  programId: string
): Promise<ProgramAttending[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_attendings")
    .select(
      "id, program_id, full_name, display_name, is_active, created_by, updated_by, created_at, updated_at"
    )
    .eq("program_id", programId)
    .order("is_active", { ascending: false })
    .order("display_name", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load program attendings: ${error.message}`);
  }

  return ((data ?? []) as ProgramAttendingRow[]).map(mapProgramAttending);
}

export async function createProgramAttending(params: {
  programId: string;
  userId: string;
  input: ProgramAttendingInput;
}): Promise<ProgramAttending> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_attendings")
    .insert({
      program_id: params.programId,
      full_name: params.input.fullName,
      display_name: params.input.displayName ?? null,
      is_active: params.input.isActive ?? true,
      created_by: params.userId,
      updated_by: params.userId,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, program_id, full_name, display_name, is_active, created_by, updated_by, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(`Failed to create program attending: ${error.message}`);
  }

  return mapProgramAttending(data as ProgramAttendingRow);
}

export async function updateProgramAttending(params: {
  programId: string;
  attendingId: string;
  userId: string;
  input: Partial<ProgramAttendingInput>;
}): Promise<ProgramAttending> {
  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    updated_by: params.userId,
    updated_at: new Date().toISOString(),
  };

  if (typeof params.input.fullName === "string") {
    const fullName = params.input.fullName.trim();
    if (!fullName) {
      throw new Error("fullName cannot be empty.");
    }

    updates.full_name = fullName;
  }

  if (params.input.displayName !== undefined) {
    updates.display_name =
      typeof params.input.displayName === "string" &&
      params.input.displayName.trim().length > 0
        ? params.input.displayName.trim()
        : null;
  }

  if (typeof params.input.isActive === "boolean") {
    updates.is_active = params.input.isActive;
  }

  const { data, error } = await supabase
    .from("program_attendings")
    .update(updates)
    .eq("id", params.attendingId)
    .eq("program_id", params.programId)
    .select(
      "id, program_id, full_name, display_name, is_active, created_by, updated_by, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update program attending: ${error.message}`);
  }

  if (!data) {
    throw new Error("Program attending not found.");
  }

  return mapProgramAttending(data as ProgramAttendingRow);
}

export async function deactivateProgramAttending(params: {
  programId: string;
  attendingId: string;
  userId: string;
}): Promise<ProgramAttending> {
  return updateProgramAttending({
    programId: params.programId,
    attendingId: params.attendingId,
    userId: params.userId,
    input: {
      isActive: false,
    },
  });
}

export async function listMonthAttendingAssignments(
  programId: string,
  month: string
): Promise<ProgramAttendingMonthPayload> {
  const supabase = await createClient();
  const { monthStart, monthEnd } = getMonthRange(month);

  const [attendingsResult, assignmentsResult] = await Promise.all([
    listProgramAttendings(programId),
    supabase
      .from("program_call_attending_assignments")
      .select(
        `
          id,
          program_id,
          attending_id,
          coverage_date,
          coverage_scope,
          is_default,
          is_active,
          created_by,
          updated_by,
          created_at,
          updated_at,
          program_attendings!program_call_attending_assignments_attending_id_fkey (
            id,
            full_name,
            display_name
          )
        `
      )
      .eq("program_id", programId)
      .eq("is_active", true)
      .gte("coverage_date", monthStart)
      .lte("coverage_date", monthEnd)
      .order("coverage_date", { ascending: true })
      .order("coverage_scope", { ascending: true }),
  ]);

  if (assignmentsResult.error) {
    throw new Error(
      `Failed to load attending month assignments: ${assignmentsResult.error.message}`
    );
  }

  return {
    month,
    monthStart,
    monthEnd,
    attendings: attendingsResult,
    assignments: ((assignmentsResult.data ?? []) as ProgramCallAttendingAssignmentRow[]).map(
      mapProgramCallAttendingAssignment
    ),
  };
}

export async function upsertMonthAttendingAssignments(params: {
  programId: string;
  month: string;
  userId: string;
  assignments: ProgramAttendingMonthAssignmentInput[];
}): Promise<ProgramAttendingMonthPayload> {
  const supabase = await createClient();
  const { monthStart, monthEnd } = getMonthRange(params.month);

  const attendingIds = Array.from(
    new Set(params.assignments.map((assignment) => assignment.attendingId))
  );

  if (attendingIds.length > 0) {
    const { data: validAttendings, error: attendingError } = await supabase
      .from("program_attendings")
      .select("id")
      .eq("program_id", params.programId)
      .eq("is_active", true)
      .in("id", attendingIds);

    if (attendingError) {
      throw new Error(
        `Failed to validate attending assignments: ${attendingError.message}`
      );
    }

    const validIds = new Set((validAttendings ?? []).map((row) => String(row.id)));
    const invalidId = attendingIds.find((id) => !validIds.has(id));

    if (invalidId) {
      throw new Error("One or more attendings do not belong to this program.");
    }
  }

  const nextKeys = new Set(
    params.assignments.map(
      (assignment) =>
        `${assignment.coverageDate}__${assignment.coverageScope ?? DEFAULT_PROGRAM_ATTENDING_SCOPE}__${assignment.attendingId}__${assignment.isDefault ? "1" : "0"}`
    )
  );

  const { data: existingRows, error: existingError } = await supabase
    .from("program_call_attending_assignments")
    .select("id, coverage_date, coverage_scope, attending_id, is_default")
    .eq("program_id", params.programId)
    .gte("coverage_date", monthStart)
    .lte("coverage_date", monthEnd)
    .eq("is_active", true);

  if (existingError) {
    throw new Error(
      `Failed to load existing month attending assignments: ${existingError.message}`
    );
  }

  const deactivateIds = ((existingRows ?? []) as Array<{
    id: string;
    coverage_date: string;
    coverage_scope: string;
    attending_id: string;
    is_default: boolean;
  }>)
    .filter((row) => {
      const key = `${row.coverage_date}__${row.coverage_scope}__${row.attending_id}__${row.is_default ? "1" : "0"}`;
      return !nextKeys.has(key);
    })
    .map((row) => row.id);

  if (deactivateIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from("program_call_attending_assignments")
      .update({
        is_active: false,
        updated_by: params.userId,
        updated_at: new Date().toISOString(),
      })
      .in("id", deactivateIds)
      .eq("program_id", params.programId);

    if (deactivateError) {
      throw new Error(
        `Failed to retire month attending assignments: ${deactivateError.message}`
      );
    }
  }

  if (params.assignments.length > 0) {
    const { error: upsertError } = await supabase
      .from("program_call_attending_assignments")
      .upsert(
        params.assignments.map((assignment) => ({
          program_id: params.programId,
          attending_id: assignment.attendingId,
          coverage_date: assignment.coverageDate,
          coverage_scope:
            assignment.coverageScope ?? DEFAULT_PROGRAM_ATTENDING_SCOPE,
          is_default: assignment.isDefault ?? true,
          is_active: true,
          created_by: params.userId,
          updated_by: params.userId,
          updated_at: new Date().toISOString(),
        })),
        {
          onConflict:
            "program_id,coverage_date,coverage_scope,attending_id,is_default",
        }
      );

    if (upsertError) {
      throw new Error(
        `Failed to save month attending assignments: ${upsertError.message}`
      );
    }
  }

  return listMonthAttendingAssignments(params.programId, params.month);
}
