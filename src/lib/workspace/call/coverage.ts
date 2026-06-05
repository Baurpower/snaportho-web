import { createClient } from "@/utils/supabase/server";
import { getPgyFromGradYear, getTrainingLevelFromPgy } from "@/lib/workspace/pgy";

export type MonthlyCoverageResident = {
  membershipId: string | null;
  rosterId: string | null;
  resident: string;
  level: string;
  service: string | null;
  startDate: string | null;
  endDate: string | null;
  gradYear: number | null;
  pgyYear: number | null;
};

export type MonthlyCoverageGroup = {
  rotationId: string | null;
  rotation: string;
  shortName: string | null;
  category: string | null;
  color: string | null;
  residents: MonthlyCoverageResident[];
};

export type MonthlyCoverageResponse = {
  monthStart: string;
  monthEnd: string;
  groups: MonthlyCoverageGroup[];
};

type CoverageRoster = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  grad_year: number | null;
  role: string | null;
  program_membership_id: string | null;
};

type CoverageRotation = {
  id: string | null;
  name: string | null;
  short_name: string | null;
  category: string | null;
  color: string | null;
  sort_order: number | null;
};

type CoverageAssignmentRow = {
  id: string;
  roster_id: string | null;
  program_membership_id: string | null;
  start_date: string | null;
  end_date: string | null;
  site_label: string | null;
  team_label: string | null;
  notes: string | null;
  program_roster: CoverageRoster | CoverageRoster[] | null;
  rotations: CoverageRotation | CoverageRotation[] | null;
};

function normalizeRoster(
  roster: CoverageRoster | CoverageRoster[] | null
): CoverageRoster | null {
  if (!roster) return null;
  if (Array.isArray(roster)) return roster[0] ?? null;
  return roster;
}

function normalizeRotation(
  rotation: CoverageRotation | CoverageRotation[] | null
): CoverageRotation | null {
  if (!rotation) return null;
  if (Array.isArray(rotation)) return rotation[0] ?? null;
  return rotation;
}

function deriveLevel(gradYear: number | null, activeMonthStartDate: string): string {
  const pgyYear = getPgyFromGradYear(gradYear, activeMonthStartDate);
  const trainingLevel = getTrainingLevelFromPgy(pgyYear);
  if (trainingLevel) return trainingLevel;
  return "Resident";
}

function getRosterDisplayName(roster: CoverageRoster | null): string {
  if (roster?.full_name?.trim()) {
    return roster.full_name.trim();
  }

  const first = roster?.first_name?.trim() ?? "";
  const last = roster?.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();

  return combined || "Unknown Resident";
}

function deriveService(row: CoverageAssignmentRow): string | null {
  const rotation = normalizeRotation(row.rotations);
  return row.team_label ?? row.site_label ?? rotation?.category ?? null;
}

export async function getMonthlyCoverageForProgram(
  programId: string,
  monthStart: string,
  monthEnd: string
): Promise<MonthlyCoverageResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rotation_assignments")
    .select(`
      id,
      roster_id,
      program_membership_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      program_roster (
        id,
        full_name,
        first_name,
        last_name,
        grad_year,
        role,
        program_membership_id
      ),
      rotations (
        id,
        name,
        short_name,
        category,
        color,
        sort_order
      )
    `)
    .eq("program_id", programId)
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch monthly coverage: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as CoverageAssignmentRow[];

  const grouped = new Map<string, MonthlyCoverageGroup>();

  for (const row of rows) {
    const roster = normalizeRoster(row.program_roster);
    const rotation = normalizeRotation(row.rotations);

    const gradYear = roster?.grad_year ?? null;
    const pgyYear = getPgyFromGradYear(gradYear, monthStart);

    const rotationKey = rotation?.id ?? `unknown-${row.id}`;

    if (!grouped.has(rotationKey)) {
      grouped.set(rotationKey, {
        rotationId: rotation?.id ?? null,
        rotation: rotation?.name ?? "Unknown Rotation",
        shortName: rotation?.short_name ?? null,
        category: rotation?.category ?? null,
        color: rotation?.color ?? null,
        residents: [],
      });
    }

    grouped.get(rotationKey)!.residents.push({
      membershipId: roster?.program_membership_id ?? row.program_membership_id ?? null,
      rosterId: roster?.id ?? row.roster_id ?? null,
      resident: getRosterDisplayName(roster),
      level: deriveLevel(gradYear, monthStart),
      service: deriveService(row),
      startDate: row.start_date,
      endDate: row.end_date,
      gradYear,
      pgyYear,
    });
  }

  const groups = Array.from(grouped.values()).sort((a, b) =>
    a.rotation.localeCompare(b.rotation)
  );

  return {
    monthStart,
    monthEnd,
    groups,
  };
}
