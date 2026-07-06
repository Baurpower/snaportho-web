import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";
import {
  normalizeRuleCode,
  type CallValidationResident,
  type CallValidationRotation,
  type CallValidationRule,
  type CallValidationTimeOff,
} from "@/lib/workspace/call/validation";
import { getEffectiveRules } from "@/lib/workspace/call/rule-definitions";
import { migratePersistedCallRules } from "@/lib/workspace/call/persisted-rule-migration";
import {
  buildResidentIdentityMaps,
} from "@/lib/workspace/call/resident-identity";

type ProgramCallRuleSetRow = {
  id: string;
};

type ProgramCallRuleRow = {
  id: string;
  rule_set_id: string;
  rule_type: string;
  name: string;
  is_enabled: boolean;
  is_hard_rule: boolean;
  priority: number;
  scope: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  created_at: string;
};

type ProgramRosterResidentRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  program_membership_id: string | null;
  role: string | null;
  grad_year: number | null;
};

type AvailabilityEventRow = {
  id: string;
  membership_id: string | null;
  roster_id: string | null;
  event_type: string | null;
  start_date: string | null;
  end_date: string | null;
  title: string | null;
  notes: string | null;
  approval_status: string | null;
};

type RotationAssignmentRow = {
  id: string;
  program_membership_id: string | null;
  roster_id: string | null;
  rotation_id: string | null;
  start_date: string | null;
  end_date: string | null;
  site_label: string | null;
  team_label: string | null;
  notes: string | null;
  rotations:
    | {
        id: string | null;
        name: string | null;
        short_name: string | null;
        category: string | null;
      }
    | {
        id: string | null;
        name: string | null;
        short_name: string | null;
        category: string | null;
      }[]
    | null;
};

export type LoadedProgramCallValidationContext = {
  rules: CallValidationRule[];
  residents: CallValidationResident[];
  timeOff: CallValidationTimeOff[];
  rotations: CallValidationRotation[];
  programContext: {
    programId: string;
    ruleSetId: string | null;
    dateWindow?: {
      startDate: string | null;
      endDate: string | null;
    };
  };
};

type SupabaseClient = ReturnType<typeof createAdminClient>;

function toValidationRule(row: ProgramCallRuleRow): CallValidationRule {
  return {
    id: row.id,
    ruleSetId: row.rule_set_id,
    name: row.name,
    ruleType: row.rule_type,
    ruleCode: normalizeRuleCode(row.rule_type),
    isEnabled: row.is_enabled,
    isHardRule: row.is_hard_rule,
    severity: row.is_hard_rule ? "error" : "warning",
    priority: row.priority,
    scope: row.scope ?? {},
    config: row.config ?? {},
  };
}

function getResidentDisplayName(row: ProgramRosterResidentRow) {
  const joinedName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return row.full_name?.trim() || joinedName || "Unknown Resident";
}

function toValidationResident(
  row: ProgramRosterResidentRow,
  effectiveDate?: string | null
): CallValidationResident {
  const residentName = getResidentDisplayName(row);
  const gradYear = row.grad_year ?? null;
  const status = getResidentStatusDetails(gradYear, effectiveDate);

  return {
    residentId: row.id,
    membershipId: row.id,
    rosterId: row.id,
    programMembershipId: row.program_membership_id ?? null,
    residentName,
    displayName: residentName,
    trainingLevel: status.statusLabel === "Unknown" ? null : status.statusLabel,
    residentStatus: status.statusLabel,
    role: row.role ?? null,
    pgyYear: status.pgyYear,
    gradYear,
    classYear: gradYear,
    isGraduated: status.isGraduated,
    isActiveResident: status.isActiveResident,
  };
}

function toValidationTimeOff(
  row: AvailabilityEventRow,
  residentIdByProgramMembershipId: Map<string, string>
): CallValidationTimeOff {
  const residentId =
    row.roster_id ??
    (row.membership_id
      ? residentIdByProgramMembershipId.get(row.membership_id) ?? null
      : null);

  return {
    id: row.id,
    residentId,
    membershipId: residentId,
    rosterId: residentId,
    programMembershipId: row.membership_id ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    type: row.event_type ?? null,
    status: row.approval_status ?? null,
    reason: row.title ?? row.notes ?? null,
  };
}

function normalizeRotationRelation(row: RotationAssignmentRow["rotations"]) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function toValidationRotation(
  row: RotationAssignmentRow,
  residentIdByProgramMembershipId: Map<string, string>
): CallValidationRotation {
  const rotation = normalizeRotationRelation(row.rotations);
  const rotationName =
    rotation?.short_name ??
    rotation?.name ??
    row.team_label ??
    row.site_label ??
    "Unknown Rotation";

  const residentId =
    row.roster_id ??
    (row.program_membership_id
      ? residentIdByProgramMembershipId.get(row.program_membership_id) ?? null
      : null);

  return {
    id: row.id,
    residentId,
    membershipId: residentId,
    rosterId: residentId,
    programMembershipId: row.program_membership_id ?? null,
    rotationId: row.rotation_id ?? rotation?.id ?? null,
    rotationName,
    shortName: rotation?.short_name ?? null,
    category: rotation?.category ?? null,
    service: row.team_label ?? row.site_label ?? rotation?.category ?? null,
    notes: row.notes ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
  };
}

async function resolveRuleSetId(
  supabase: SupabaseClient,
  programId: string,
  ruleSetId?: string | null
) {
  if (ruleSetId) {
    return ruleSetId;
  }

  const { data, error } = await supabase
    .from("program_call_rule_sets")
    .select("id")
    .eq("program_id", programId)
    .eq("is_default", true)
    .maybeSingle<ProgramCallRuleSetRow>();

  if (error) {
    throw new Error(`Failed to load default program call rule set: ${error.message}`);
  }

  return data?.id ?? null;
}

async function loadValidationRulesForResolvedRuleSet(params: {
  supabase: SupabaseClient;
  programId: string;
  ruleSetId: string;
}) {
  const { supabase, programId, ruleSetId } = params;
  const { data, error } = await supabase
    .from("program_call_rules")
    .select(
      "id, rule_set_id, rule_type, name, is_enabled, is_hard_rule, priority, scope, config, created_at"
    )
    .eq("program_id", programId)
    .eq("rule_set_id", ruleSetId)
    .eq("is_enabled", true) // DB-level filter for performance
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load program call validation rules: ${error.message}`);
  }

  const migrated = migratePersistedCallRules((data ?? []) as ProgramCallRuleRow[]);
  // Belt-and-suspenders: run through the canonical effective filter (Phase 9 alignment)
  const effective = getEffectiveRules(migrated.rules as ProgramCallRuleRow[], {
    includeDisabled: false,
  });
  return (effective as ProgramCallRuleRow[]).map(toValidationRule);
}

async function loadValidationResidents(params: {
  supabase: SupabaseClient;
  programId: string;
  effectiveDate?: string | null;
}) {
  const { supabase, programId, effectiveDate } = params;
  const { data, error } = await supabase
    .from("program_roster")
    .select(
      "id, full_name, first_name, last_name, program_membership_id, role, grad_year"
    )
    .eq("program_id", programId)
    .order("grad_year", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to load program call validation residents: ${error.message}`);
  }

  return ((data ?? []) as ProgramRosterResidentRow[]).map((row) =>
    toValidationResident(row, effectiveDate)
  );
}

async function loadValidationTimeOff(params: {
  supabase: SupabaseClient;
  programId: string;
  residentIdByProgramMembershipId: Map<string, string>;
}) {
  const { supabase, programId, residentIdByProgramMembershipId } = params;
  const { data, error } = await supabase
    .from("availability_events")
    .select(
      "id, membership_id, roster_id, event_type, start_date, end_date, title, notes, approval_status"
    )
    .eq("program_id", programId)
    .eq("approval_status", "approved");

  if (error) {
    throw new Error(`Failed to load program call validation time off: ${error.message}`);
  }

  return ((data ?? []) as AvailabilityEventRow[])
    .filter((row) => row.start_date && row.end_date)
    .map((row) => toValidationTimeOff(row, residentIdByProgramMembershipId))
    .filter((row) => Boolean(row.residentId));
}

async function loadValidationRotations(params: {
  supabase: SupabaseClient;
  programId: string;
  dateStart?: string | null;
  dateEnd?: string | null;
  residentIdByProgramMembershipId: Map<string, string>;
}) {
  const {
    supabase,
    programId,
    dateStart,
    dateEnd,
    residentIdByProgramMembershipId,
  } = params;
  let query = supabase
    .from("rotation_assignments")
    .select(
      `
      id,
      program_membership_id,
      roster_id,
      rotation_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      rotations (
        id,
        name,
        short_name,
        category
      )
    `
    )
    .eq("program_id", programId)
    .order("start_date", { ascending: true });

  if (dateStart && dateEnd) {
    query = query.lte("start_date", dateEnd).gte("end_date", dateStart);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load program call validation rotations: ${error.message}`);
  }

  return ((data ?? []) as RotationAssignmentRow[])
    .filter((row) => row.start_date && row.end_date)
    .map((row) => toValidationRotation(row, residentIdByProgramMembershipId))
    .filter((row) => Boolean(row.residentId));
}

export async function loadProgramCallValidationRules(
  programId: string,
  ruleSetId?: string | null
): Promise<CallValidationRule[]> {
  // Validation must see the full program rule/roster context, not a user-scoped subset.
  const supabase = createAdminClient();
  const resolvedRuleSetId = await resolveRuleSetId(
    supabase,
    programId,
    ruleSetId
  );

  if (!resolvedRuleSetId) {
    return [];
  }

  return loadValidationRulesForResolvedRuleSet({
    supabase,
    programId,
    ruleSetId: resolvedRuleSetId,
  });
}

export async function loadProgramCallValidationContext(
  programId: string,
  ruleSetId?: string | null,
  options?: {
    dateStart?: string | null;
    dateEnd?: string | null;
  }
): Promise<LoadedProgramCallValidationContext> {
  // Validation must see the full program rule/roster context, not a user-scoped subset.
  const supabase = createAdminClient();
  const resolvedRuleSetId = await resolveRuleSetId(
    supabase,
    programId,
    ruleSetId
  );

  const rules = resolvedRuleSetId
    ? await loadValidationRulesForResolvedRuleSet({
        supabase,
        programId,
        ruleSetId: resolvedRuleSetId,
      })
    : [];
  const residents = await loadValidationResidents({
    supabase,
    programId,
    effectiveDate: options?.dateStart ?? options?.dateEnd ?? null,
  });
  const { residentIdByProgramMembershipId } = buildResidentIdentityMaps(residents);
  const timeOff = await loadValidationTimeOff({
    supabase,
    programId,
    residentIdByProgramMembershipId,
  });
  const rotations = await loadValidationRotations({
    supabase,
    programId,
    dateStart: options?.dateStart ?? null,
    dateEnd: options?.dateEnd ?? null,
    residentIdByProgramMembershipId,
  });

  return {
    rules,
    residents,
    timeOff,
    rotations,
    programContext: {
      programId,
      ruleSetId: resolvedRuleSetId,
      dateWindow: {
        startDate: options?.dateStart ?? null,
        endDate: options?.dateEnd ?? null,
      },
    },
    // TODO: Use resident PGY/role metadata in shared PGY and scope-aware validators.
    // TODO: Join resident availability identity context for rule-aware validation.
    // TODO: Refine time-off loading for partial-day and non-blocking availability cases.
    // TODO: Refine rotation loading if future validation needs narrower slot-type-aware windows.
  };
}
