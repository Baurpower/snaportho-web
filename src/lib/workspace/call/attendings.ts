import { createClient } from "@/utils/supabase/server";
import type {
  ProgramAttending,
  ProgramAttendingCoverageSlot,
  ProgramAttendingInput,
  ProgramAttendingMonthPayload,
  ProgramCallAttendingAssignment,
} from "@/lib/workspace/call/types";
import {
  composeProgramAttendingFullName,
  DEFAULT_PROGRAM_ATTENDING_SCOPE,
  getMonthRange,
  parseProgramAttendingFullName,
  type ProgramAttendingMonthAssignmentInput,
} from "@/lib/workspace/call/attendings-shared";

export {
  canManageProgramAttendings,
  composeProgramAttendingFullName,
  DEFAULT_PROGRAM_ATTENDING_SCOPE,
  getAttendingDisplayName,
  getAttendingLastName,
  getAttendingShortName,
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
  first_name: string | null;
  last_name: string | null;
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
  slot_id?: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  program_attendings:
    | {
        id: string;
        full_name: string;
        first_name: string | null;
        last_name: string | null;
        display_name: string | null;
      }
    | {
        id: string;
        full_name: string;
        first_name: string | null;
        last_name: string | null;
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
    firstName: row.first_name,
    lastName: row.last_name,
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
    attendingFirstName: attending?.first_name ?? null,
    attendingLastName: attending?.last_name ?? null,
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
      "id, program_id, full_name, first_name, last_name, display_name, is_active, created_by, updated_by, created_at, updated_at"
    )
    .eq("program_id", programId)
    .order("is_active", { ascending: false })
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true, nullsFirst: false })
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
      first_name: params.input.firstName,
      last_name: params.input.lastName,
      display_name: params.input.displayName ?? null,
      is_active: params.input.isActive ?? true,
      created_by: params.userId,
      updated_by: params.userId,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, program_id, full_name, first_name, last_name, display_name, is_active, created_by, updated_by, created_at, updated_at"
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

  const firstName =
    typeof params.input.firstName === "string" ? params.input.firstName.trim() : "";
  const lastName =
    typeof params.input.lastName === "string" ? params.input.lastName.trim() : "";

  if (params.input.firstName !== undefined || params.input.lastName !== undefined) {
    if (!firstName || !lastName) {
      throw new Error("firstName and lastName are required.");
    }

    updates.first_name = firstName;
    updates.last_name = lastName;
    updates.full_name = composeProgramAttendingFullName(firstName, lastName);
  } else if (typeof params.input.fullName === "string") {
    const fullName = params.input.fullName.trim();
    const parsed = parseProgramAttendingFullName(fullName);
    if (!fullName || !parsed.firstName || !parsed.lastName) {
      throw new Error("firstName and lastName are required.");
    }

    updates.full_name = fullName;
    updates.first_name = parsed.firstName;
    updates.last_name = parsed.lastName;
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
      "id, program_id, full_name, first_name, last_name, display_name, is_active, created_by, updated_by, created_at, updated_at"
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

export async function listProgramAttendingCoverageSlots(
  programId: string
): Promise<ProgramAttendingCoverageSlot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_attending_coverage_slots")
    .select(
      "id, program_id, name, abbreviation, color, is_active, sort_order, description, created_at, updated_at"
    )
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load coverage slots: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    programId: row.program_id,
    name: row.name,
    abbreviation: row.abbreviation,
    color: row.color,
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
    description: row.description,
  }));
}

export async function listMonthAttendingAssignments(
  programId: string,
  month: string
): Promise<ProgramAttendingMonthPayload> {
  const supabase = await createClient();
  const { monthStart, monthEnd } = getMonthRange(month);

  const [attendingsResult, slotsResult] = await Promise.all([
    listProgramAttendings(programId),
    listProgramAttendingCoverageSlots(programId),
  ]);

  const assignmentsResult = await supabase
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
        slot_id,
        created_by,
        updated_by,
        created_at,
        updated_at,
        program_attendings!program_call_attending_assignments_attending_id_fkey (
          id,
          full_name,
          first_name,
          last_name,
          display_name
        )
      `
    )
    .eq("program_id", programId)
    .eq("is_active", true)
    .gte("coverage_date", monthStart)
    .lte("coverage_date", monthEnd)
    .order("coverage_date", { ascending: true })
    .order("coverage_scope", { ascending: true });

  if (assignmentsResult.error) {
    throw new Error(
      `Failed to load attending month assignments: ${assignmentsResult.error.message}`
    );
  }

  // Build slot lookup from the separately fetched slots (avoids relationship cache issues in the join)
  const slotById = new Map<string, ProgramAttendingCoverageSlot>();
  slotsResult.forEach((slot) => slotById.set(slot.id, slot));

  const assignments = ((assignmentsResult.data ?? []) as unknown as ProgramCallAttendingAssignmentRow[]).map((row) => {
    const base = mapProgramCallAttendingAssignment(row);
    const slot = row.slot_id ? slotById.get(row.slot_id) : null;
    return {
      ...base,
      slotId: row.slot_id ?? null,
      slotName: slot?.name ?? null,
      slotAbbreviation: slot?.abbreviation ?? null,
      slotColor: slot?.color ?? null,
    };
  });

  return {
    month,
    monthStart,
    monthEnd,
    attendings: attendingsResult,
    slots: slotsResult,
    assignments,
  };
}

export async function upsertMonthAttendingAssignments(params: {
  programId: string;
  month: string;
  userId: string;
  assignments: ProgramAttendingMonthAssignmentInput[];
}): Promise<ProgramAttendingMonthPayload> {
  const supabase = await createClient();
  const { monthStart } = getMonthRange(params.month);

  const { error } = await supabase.rpc(
    "replace_program_call_attending_assignments_month",
    {
      target_program_id: params.programId,
      target_month_start: monthStart,
      replacement_assignments: params.assignments.map((assignment) => ({
        coverage_date: assignment.coverageDate,
        attending_id: assignment.attendingId,
        slot_id: assignment.slotId ?? null,
        coverage_scope:
          assignment.coverageScope ?? DEFAULT_PROGRAM_ATTENDING_SCOPE,
        is_default: assignment.isDefault ?? true,
      })),
    }
  );

  if (error) {
    throw new Error(`Failed to save month attending assignments: ${error.message}`);
  }

  return listMonthAttendingAssignments(params.programId, params.month);
}
