import type { SupabaseClient } from "@supabase/supabase-js";
import { getProgramRotationAssignmentsInRange } from "@/lib/workspace/call/rotations";
import { getPgyFromGradYear, getTrainingLevelFromPgy } from "@/lib/workspace/pgy";

type ProgramRow = {
  id: string;
  name: string | null;
  slug: string | null;
  institution_name: string | null;
  timezone: string | null;
  city: string | null;
  state: string | null;
};

type ProgramRosterRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  grad_year: number | null;
  role: string | null;
  program_membership_id: string | null;
  claimed_by_user_id: string | null;
};

type RotationRow = {
  id: string;
  name: string | null;
  short_name: string | null;
  category: string | null;
  color: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type RotationTrackRow = {
  id: string;
  program_id: string;
  academic_year_start: number;
  name: string;
  description: string | null;
  target_pgy_year: number | null;
  sort_order: number | null;
  is_active: boolean | null;
  copied_from_track_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type RotationTrackBlockRow = {
  id: string;
  track_id: string;
  rotation_id: string;
  start_date: string;
  end_date: string;
  site_label: string | null;
  team_label: string | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  rotations?: RotationRow | RotationRow[] | null;
  rotation_tracks?: RotationTrackRow | RotationTrackRow[] | null;
};

type RotationTrackMembershipRow = {
  id: string;
  track_id: string;
  roster_id: string;
  program_membership_id: string | null;
  created_at: string;
  updated_at: string;
  program_roster?: ProgramRosterRow | ProgramRosterRow[] | null;
  rotation_tracks?: RotationTrackRow | RotationTrackRow[] | null;
};

type RotationAssignmentOverlapRow = {
  id: string;
  roster_id: string | null;
  program_membership_id: string | null;
  rotation_id: string | null;
  start_date: string | null;
  end_date: string | null;
  track_id: string | null;
  track_block_id: string | null;
  source_kind: string | null;
};

export type RotationSettingsProgram = {
  id: string;
  name: string | null;
  slug: string | null;
  institutionName: string | null;
  timezone: string | null;
  city: string | null;
  state: string | null;
};

export type RotationSettingsMember = {
  membershipId: string;
  programMembershipId: string | null;
  rosterId: string;
  displayName: string;
  gradYear: number | null;
  pgyYear: number | null;
  trainingLevel: string | null;
  role: string | null;
  userId: string | null;
  isActive: boolean;
};

export type RotationCatalogItem = {
  id: string;
  name: string | null;
  shortName: string | null;
  category: string | null;
  color: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
};

export type RotationTrackItem = {
  id: string;
  programId: string;
  academicYearStart: number;
  name: string;
  description: string | null;
  targetPgyYear: number | null;
  sortOrder: number | null;
  isActive: boolean | null;
  copiedFromTrackId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RotationTrackBlockItem = {
  id: string;
  trackId: string;
  rotationId: string;
  startDate: string;
  endDate: string;
  siteLabel: string | null;
  teamLabel: string | null;
  notes: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  rotation: {
    id: string;
    name: string | null;
    shortName: string | null;
    category: string | null;
    color: string | null;
  } | null;
};

export type RotationTrackMembershipItem = {
  id: string;
  trackId: string;
  rosterId: string;
  programMembershipId: string | null;
  createdAt: string;
  updatedAt: string;
  member: RotationSettingsMember | null;
};

export type CreateRotationTrackInput = {
  academicYearStart: number;
  name: string;
  description?: string | null;
  targetPgyYear?: number | null;
  sortOrder?: number | null;
  createdBy?: string | null;
};

export type UpdateRotationTrackInput = {
  name?: string;
  description?: string | null;
  targetPgyYear?: number | null;
  sortOrder?: number | null;
  isActive?: boolean;
  updatedBy?: string | null;
};

export type ReplaceRotationTrackBlocksInput = {
  trackId: string;
  blocks: Array<{
    id?: string;
    rotationId: string;
    startDate: string;
    endDate: string;
    siteLabel?: string | null;
    teamLabel?: string | null;
    notes?: string | null;
    sortOrder?: number | null;
  }>;
};

export type ReplaceRotationTrackMembershipsInput = {
  trackId: string;
  rosterIds: string[];
};

export type ImportRotationTracksInput = {
  programId: string;
  fromAcademicYearStart: number;
  toAcademicYearStart: number;
  copyMemberships: boolean;
  createdBy?: string | null;
};

export type GenerateAssignmentsMode = "overwrite_generated" | "fill_gaps";

export type GenerateRotationAssignmentsInput = {
  programId: string;
  academicYearStart: number;
  trackIds?: string[] | null;
  mode: GenerateAssignmentsMode;
  createdBy?: string | null;
};

export type GenerateAssignmentsConflict = {
  rosterId: string;
  trackId: string;
  trackBlockId: string;
  startDate: string;
  endDate: string;
  reason: string;
  existingAssignmentId?: string | null;
};

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getRosterDisplayName(row: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}) {
  if (row.full_name?.trim()) return row.full_name.trim();

  const fallbackName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return fallbackName || "Unknown";
}

function mapProgram(row: ProgramRow | null, fallbackProgramId?: string | null): RotationSettingsProgram {
  return {
    id: row?.id ?? fallbackProgramId ?? "",
    name: row?.name ?? null,
    slug: row?.slug ?? null,
    institutionName: row?.institution_name ?? null,
    timezone: row?.timezone ?? null,
    city: row?.city ?? null,
    state: row?.state ?? null,
  };
}

function mapMember(row: ProgramRosterRow, effectiveDate: string): RotationSettingsMember {
  const gradYear = row.grad_year ?? null;
  const pgyYear = getPgyFromGradYear(gradYear, effectiveDate);

  return {
    membershipId: row.id,
    programMembershipId: row.program_membership_id ?? null,
    rosterId: row.id,
    displayName: getRosterDisplayName(row),
    gradYear,
    pgyYear,
    trainingLevel: getTrainingLevelFromPgy(pgyYear),
    role: row.role ?? null,
    userId: row.claimed_by_user_id ?? null,
    isActive: true,
  };
}

function mapRotation(row: RotationRow): RotationCatalogItem {
  return {
    id: row.id,
    name: row.name ?? null,
    shortName: row.short_name ?? null,
    category: row.category ?? null,
    color: row.color ?? null,
    isActive: row.is_active ?? null,
    sortOrder: row.sort_order ?? null,
  };
}

function mapTrack(row: RotationTrackRow): RotationTrackItem {
  return {
    id: row.id,
    programId: row.program_id,
    academicYearStart: row.academic_year_start,
    name: row.name,
    description: row.description ?? null,
    targetPgyYear: row.target_pgy_year ?? null,
    sortOrder: row.sort_order ?? null,
    isActive: row.is_active ?? null,
    copiedFromTrackId: row.copied_from_track_id ?? null,
    createdBy: row.created_by ?? null,
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBlock(row: RotationTrackBlockRow): RotationTrackBlockItem {
  const rotation = normalizeOne(row.rotations);

  return {
    id: row.id,
    trackId: row.track_id,
    rotationId: row.rotation_id,
    startDate: row.start_date,
    endDate: row.end_date,
    siteLabel: row.site_label ?? null,
    teamLabel: row.team_label ?? null,
    notes: row.notes ?? null,
    sortOrder: row.sort_order ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rotation: rotation
      ? {
          id: rotation.id,
          name: rotation.name ?? null,
          shortName: rotation.short_name ?? null,
          category: rotation.category ?? null,
          color: rotation.color ?? null,
        }
      : null,
  };
}

function mapMembership(
  row: RotationTrackMembershipRow,
  effectiveDate: string
): RotationTrackMembershipItem {
  const roster = normalizeOne(row.program_roster);

  return {
    id: row.id,
    trackId: row.track_id,
    rosterId: row.roster_id,
    programMembershipId: row.program_membership_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    member: roster ? mapMember(roster, effectiveDate) : null,
  };
}

export function isValidAcademicYearStart(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1900 && value <= 9999;
  }

  return typeof value === "string" && /^\d{4}$/.test(value);
}

export function parseAcademicYearStart(
  value: string | number | null | undefined
): number | null {
  if (!isValidAcademicYearStart(value)) return null;
  return typeof value === "number" ? value : Number(value);
}

export function getAcademicStartYear(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? year : year - 1;
}

export function getAcademicYearMeta(academicYearStart: number) {
  return {
    academicYearStart,
    academicYearLabel: `${academicYearStart}–${academicYearStart + 1}`,
    rangeStart: `${academicYearStart}-07-01`,
    rangeEnd: `${academicYearStart + 1}-06-30`,
  };
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validatePgyYear(value: unknown): value is number | null | undefined {
  if (value === null || value === undefined) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export async function getProgramById(
  supabase: SupabaseClient,
  programId: string
): Promise<RotationSettingsProgram> {
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, slug, institution_name, timezone, city, state")
    .eq("id", programId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load program: ${error.message}`);
  }

  return mapProgram((data ?? null) as ProgramRow | null, programId);
}

export async function listProgramMembers(
  supabase: SupabaseClient,
  programId: string,
  effectiveDate: string
): Promise<RotationSettingsMember[]> {
  const { data, error } = await supabase
    .from("program_roster")
    .select(`
      id,
      full_name,
      first_name,
      last_name,
      grad_year,
      role,
      program_membership_id,
      claimed_by_user_id
    `)
    .eq("program_id", programId)
    .order("grad_year", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to load program members: ${error.message}`);
  }

  return ((data ?? []) as ProgramRosterRow[]).map((row) => mapMember(row, effectiveDate));
}

export async function listProgramRotations(
  supabase: SupabaseClient,
  programId: string
): Promise<RotationCatalogItem[]> {
  const { data, error } = await supabase
    .from("rotations")
    .select("id, name, short_name, category, color, is_active, sort_order")
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load rotations: ${error.message}`);
  }

  return ((data ?? []) as RotationRow[]).map(mapRotation);
}

export async function listRotationTracks(
  supabase: SupabaseClient,
  params: {
    programId: string;
    academicYearStart: number;
  }
): Promise<RotationTrackItem[]> {
  const { data, error } = await supabase
    .from("rotation_tracks")
    .select(`
      id,
      program_id,
      academic_year_start,
      name,
      description,
      target_pgy_year,
      sort_order,
      is_active,
      copied_from_track_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .eq("program_id", params.programId)
    .eq("academic_year_start", params.academicYearStart)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load rotation tracks: ${error.message}`);
  }

  return ((data ?? []) as RotationTrackRow[]).map(mapTrack);
}

export async function getRotationTrackById(
  supabase: SupabaseClient,
  params: {
    programId: string;
    trackId: string;
  }
): Promise<RotationTrackItem | null> {
  const { data, error } = await supabase
    .from("rotation_tracks")
    .select(`
      id,
      program_id,
      academic_year_start,
      name,
      description,
      target_pgy_year,
      sort_order,
      is_active,
      copied_from_track_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .eq("program_id", params.programId)
    .eq("id", params.trackId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load rotation track: ${error.message}`);
  }

  return data ? mapTrack(data as RotationTrackRow) : null;
}

export async function listRotationTrackBlocks(
  supabase: SupabaseClient,
  params: {
    programId: string;
    academicYearStart?: number;
    trackId?: string;
  }
): Promise<RotationTrackBlockItem[]> {
  let query = supabase
    .from("rotation_track_blocks")
    .select(`
      id,
      track_id,
      rotation_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      sort_order,
      created_at,
      updated_at,
      rotations (
        id,
        name,
        short_name,
        category,
        color,
        is_active,
        sort_order
      ),
      rotation_tracks!inner (
        id,
        program_id,
        academic_year_start,
        name,
        description,
        target_pgy_year,
        sort_order,
        is_active,
        copied_from_track_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
    `)
    .eq("rotation_tracks.program_id", params.programId)
    .order("start_date", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (params.academicYearStart !== undefined) {
    query = query.eq("rotation_tracks.academic_year_start", params.academicYearStart);
  }

  if (params.trackId) {
    query = query.eq("track_id", params.trackId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load rotation track blocks: ${error.message}`);
  }

  return ((data ?? []) as RotationTrackBlockRow[]).map(mapBlock);
}

export async function listRotationTrackMemberships(
  supabase: SupabaseClient,
  params: {
    programId: string;
    academicYearStart?: number;
    trackId?: string;
    effectiveDate: string;
  }
): Promise<RotationTrackMembershipItem[]> {
  let query = supabase
    .from("rotation_track_memberships")
    .select(`
      id,
      track_id,
      roster_id,
      program_membership_id,
      created_at,
      updated_at,
      program_roster (
        id,
        full_name,
        first_name,
        last_name,
        grad_year,
        role,
        program_membership_id,
        claimed_by_user_id
      ),
      rotation_tracks!inner (
        id,
        program_id,
        academic_year_start,
        name,
        description,
        target_pgy_year,
        sort_order,
        is_active,
        copied_from_track_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
    `)
    .eq("rotation_tracks.program_id", params.programId)
    .order("created_at", { ascending: true });

  if (params.academicYearStart !== undefined) {
    query = query.eq("rotation_tracks.academic_year_start", params.academicYearStart);
  }

  if (params.trackId) {
    query = query.eq("track_id", params.trackId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load rotation track memberships: ${error.message}`);
  }

  return ((data ?? []) as RotationTrackMembershipRow[]).map((row) =>
    mapMembership(row, params.effectiveDate)
  );
}

export async function createRotationTrack(
  supabase: SupabaseClient,
  programId: string,
  input: CreateRotationTrackInput
): Promise<RotationTrackItem> {
  if (!input.name.trim()) {
    throw new Error("Track name is required.");
  }

  if (!validatePgyYear(input.targetPgyYear)) {
    throw new Error("targetPgyYear must be between 1 and 5.");
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("rotation_tracks")
    .insert({
      program_id: programId,
      academic_year_start: input.academicYearStart,
      name: input.name.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      target_pgy_year: input.targetPgyYear ?? null,
      sort_order: input.sortOrder ?? 0,
      created_by: input.createdBy ?? null,
      updated_by: input.createdBy ?? null,
      created_at: now,
      updated_at: now,
    })
    .select(`
      id,
      program_id,
      academic_year_start,
      name,
      description,
      target_pgy_year,
      sort_order,
      is_active,
      copied_from_track_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create rotation track: ${error.message}`);
  }

  return mapTrack(data as RotationTrackRow);
}

export async function updateRotationTrack(
  supabase: SupabaseClient,
  programId: string,
  trackId: string,
  input: UpdateRotationTrackInput
): Promise<RotationTrackItem> {
  const existingTrack = await getRotationTrackById(supabase, { programId, trackId });

  if (!existingTrack) {
    throw new Error("Rotation track not found.");
  }

  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Track name is required.");
  }

  if (!validatePgyYear(input.targetPgyYear)) {
    throw new Error("targetPgyYear must be between 1 and 5.");
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) {
    updates.description =
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim()
        : null;
  }
  if (input.targetPgyYear !== undefined) {
    updates.target_pgy_year = input.targetPgyYear ?? null;
  }
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder ?? 0;
  if (input.isActive !== undefined) updates.is_active = input.isActive;
  if (input.updatedBy !== undefined) updates.updated_by = input.updatedBy ?? null;

  const { data, error } = await supabase
    .from("rotation_tracks")
    .update(updates)
    .eq("program_id", programId)
    .eq("id", trackId)
    .select(`
      id,
      program_id,
      academic_year_start,
      name,
      description,
      target_pgy_year,
      sort_order,
      is_active,
      copied_from_track_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update rotation track: ${error.message}`);
  }

  return mapTrack(data as RotationTrackRow);
}

export async function deleteRotationTrack(
  supabase: SupabaseClient,
  programId: string,
  trackId: string
): Promise<void> {
  const { error } = await supabase
    .from("rotation_tracks")
    .delete()
    .eq("program_id", programId)
    .eq("id", trackId);

  if (error) {
    throw new Error(`Failed to delete rotation track: ${error.message}`);
  }
}

async function ensureRotationsBelongToProgram(
  supabase: SupabaseClient,
  programId: string,
  rotationIds: string[]
) {
  if (rotationIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("rotations")
    .select("id")
    .eq("program_id", programId)
    .in("id", rotationIds);

  if (error) {
    throw new Error(`Failed to validate rotations: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => String(row.id)));
}

async function getRosterRowsForProgram(
  supabase: SupabaseClient,
  programId: string,
  rosterIds: string[]
): Promise<Map<string, ProgramRosterRow>> {
  if (rosterIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("program_roster")
    .select(`
      id,
      full_name,
      first_name,
      last_name,
      grad_year,
      role,
      program_membership_id,
      claimed_by_user_id
    `)
    .eq("program_id", programId)
    .in("id", rosterIds);

  if (error) {
    throw new Error(`Failed to validate roster members: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as ProgramRosterRow[]).map((row) => [row.id, row])
  );
}

export async function replaceRotationTrackBlocks(
  supabase: SupabaseClient,
  programId: string,
  input: ReplaceRotationTrackBlocksInput
): Promise<RotationTrackBlockItem[]> {
  const track = await getRotationTrackById(supabase, {
    programId,
    trackId: input.trackId,
  });

  if (!track) {
    throw new Error("Rotation track not found.");
  }

  const rotationIds = Array.from(new Set(input.blocks.map((block) => block.rotationId)));
  const validRotationIds = await ensureRotationsBelongToProgram(
    supabase,
    programId,
    rotationIds
  );

  for (const block of input.blocks) {
    if (!validRotationIds.has(block.rotationId)) {
      throw new Error("One or more blocks reference a rotation outside this program.");
    }

    if (!isValidDateString(block.startDate) || !isValidDateString(block.endDate)) {
      throw new Error("Each block must include startDate and endDate in YYYY-MM-DD format.");
    }

    if (block.startDate > block.endDate) {
      throw new Error("Each block must have startDate on or before endDate.");
    }
  }

  const { error: deleteError } = await supabase
    .from("rotation_track_blocks")
    .delete()
    .eq("track_id", input.trackId);

  if (deleteError) {
    throw new Error(`Failed to replace rotation track blocks: ${deleteError.message}`);
  }

  if (input.blocks.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("rotation_track_blocks")
    .insert(
      input.blocks.map((block, index) => ({
        track_id: input.trackId,
        rotation_id: block.rotationId,
        start_date: block.startDate,
        end_date: block.endDate,
        site_label: block.siteLabel?.trim() ? block.siteLabel.trim() : null,
        team_label: block.teamLabel?.trim() ? block.teamLabel.trim() : null,
        notes: block.notes?.trim() ? block.notes.trim() : null,
        sort_order: block.sortOrder ?? index,
        created_at: now,
        updated_at: now,
      }))
    )
    .select(`
      id,
      track_id,
      rotation_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      sort_order,
      created_at,
      updated_at,
      rotations (
        id,
        name,
        short_name,
        category,
        color,
        is_active,
        sort_order
      )
    `)
    .order("start_date", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to save rotation track blocks: ${error.message}`);
  }

  return ((data ?? []) as RotationTrackBlockRow[]).map(mapBlock);
}

export async function replaceRotationTrackMemberships(
  supabase: SupabaseClient,
  programId: string,
  input: ReplaceRotationTrackMembershipsInput
): Promise<RotationTrackMembershipItem[]> {
  const track = await getRotationTrackById(supabase, {
    programId,
    trackId: input.trackId,
  });

  if (!track) {
    throw new Error("Rotation track not found.");
  }

  const uniqueRosterIds = Array.from(new Set(input.rosterIds));
  const rosterMap = await getRosterRowsForProgram(supabase, programId, uniqueRosterIds);

  if (uniqueRosterIds.some((rosterId) => !rosterMap.has(rosterId))) {
    throw new Error("One or more rosterIds do not belong to this program.");
  }

  const { error: deleteError } = await supabase
    .from("rotation_track_memberships")
    .delete()
    .eq("track_id", input.trackId);

  if (deleteError) {
    throw new Error(
      `Failed to replace rotation track memberships: ${deleteError.message}`
    );
  }

  if (uniqueRosterIds.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("rotation_track_memberships")
    .insert(
      uniqueRosterIds.map((rosterId) => ({
        track_id: input.trackId,
        roster_id: rosterId,
        program_membership_id: rosterMap.get(rosterId)?.program_membership_id ?? null,
        created_at: now,
        updated_at: now,
      }))
    )
    .select(`
      id,
      track_id,
      roster_id,
      program_membership_id,
      created_at,
      updated_at,
      program_roster (
        id,
        full_name,
        first_name,
        last_name,
        grad_year,
        role,
        program_membership_id,
        claimed_by_user_id
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to save rotation track memberships: ${error.message}`);
  }

  const effectiveDate = getAcademicYearMeta(track.academicYearStart).rangeStart;

  return ((data ?? []) as RotationTrackMembershipRow[]).map((row) =>
    mapMembership(row, effectiveDate)
  );
}

export async function importRotationTracksFromYear(
  supabase: SupabaseClient,
  input: ImportRotationTracksInput
) {
  const sourceTracks = await listRotationTracks(supabase, {
    programId: input.programId,
    academicYearStart: input.fromAcademicYearStart,
  });

  const destinationTracks = await listRotationTracks(supabase, {
    programId: input.programId,
    academicYearStart: input.toAcademicYearStart,
  });

  const destinationNames = new Set(destinationTracks.map((track) => track.name.trim().toLowerCase()));
  const tracksToCopy = sourceTracks.filter(
    (track) => !destinationNames.has(track.name.trim().toLowerCase())
  );

  if (tracksToCopy.length === 0) {
    return {
      createdTracksCount: 0,
      createdBlocksCount: 0,
      createdMembershipsCount: 0,
      skippedRosterIds: [] as string[],
    };
  }

  const sourceTrackIds = tracksToCopy.map((track) => track.id);
  const [sourceBlocks, sourceMemberships] = await Promise.all([
    listRotationTrackBlocks(supabase, {
      programId: input.programId,
      academicYearStart: input.fromAcademicYearStart,
    }),
    input.copyMemberships
      ? listRotationTrackMemberships(supabase, {
          programId: input.programId,
          academicYearStart: input.fromAcademicYearStart,
          effectiveDate: getAcademicYearMeta(input.fromAcademicYearStart).rangeStart,
        })
      : Promise.resolve([]),
  ]);

  const filteredBlocks = sourceBlocks.filter((block) => sourceTrackIds.includes(block.trackId));
  const filteredMemberships = sourceMemberships.filter((membership) =>
    sourceTrackIds.includes(membership.trackId)
  );

  const now = new Date().toISOString();
  const { data: insertedTracks, error: trackInsertError } = await supabase
    .from("rotation_tracks")
    .insert(
      tracksToCopy.map((track) => ({
        program_id: input.programId,
        academic_year_start: input.toAcademicYearStart,
        name: track.name,
        description: track.description,
        target_pgy_year: track.targetPgyYear,
        sort_order: track.sortOrder ?? 0,
        is_active: track.isActive ?? true,
        copied_from_track_id: track.id,
        created_by: input.createdBy ?? null,
        updated_by: input.createdBy ?? null,
        created_at: now,
        updated_at: now,
      }))
    )
    .select(`
      id,
      program_id,
      academic_year_start,
      name,
      description,
      target_pgy_year,
      sort_order,
      is_active,
      copied_from_track_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    `);

  if (trackInsertError) {
    throw new Error(`Failed to import rotation tracks: ${trackInsertError.message}`);
  }

  const createdTracks = (insertedTracks ?? []) as RotationTrackRow[];
  const newTrackIdByOldTrackId = new Map<string, string>();

  for (const row of createdTracks) {
    if (row.copied_from_track_id) {
      newTrackIdByOldTrackId.set(row.copied_from_track_id, row.id);
    }
  }

  let createdBlocksCount = 0;
  let createdMembershipsCount = 0;
  const skippedRosterIds: string[] = [];

  if (filteredBlocks.length > 0) {
    const blockPayload = filteredBlocks
      .map((block) => {
        const newTrackId = newTrackIdByOldTrackId.get(block.trackId);
        if (!newTrackId) return null;

        return {
          track_id: newTrackId,
          rotation_id: block.rotationId,
          start_date: block.startDate,
          end_date: block.endDate,
          site_label: block.siteLabel,
          team_label: block.teamLabel,
          notes: block.notes,
          sort_order: block.sortOrder ?? 0,
          created_at: now,
          updated_at: now,
        };
      })
      .filter(Boolean);

    if (blockPayload.length > 0) {
      const { data: insertedBlocks, error: blockInsertError } = await supabase
        .from("rotation_track_blocks")
        .insert(blockPayload)
        .select("id");

      if (blockInsertError) {
        throw new Error(
          `Failed to import rotation track blocks: ${blockInsertError.message}`
        );
      }

      createdBlocksCount = (insertedBlocks ?? []).length;
    }
  }

  if (input.copyMemberships && filteredMemberships.length > 0) {
    const rosterIds = Array.from(new Set(filteredMemberships.map((membership) => membership.rosterId)));
    const validRosterMap = await getRosterRowsForProgram(supabase, input.programId, rosterIds);

    const membershipPayload = filteredMemberships
      .map((membership) => {
        const newTrackId = newTrackIdByOldTrackId.get(membership.trackId);
        const roster = validRosterMap.get(membership.rosterId);

        if (!newTrackId || !roster) {
          skippedRosterIds.push(membership.rosterId);
          return null;
        }

        return {
          track_id: newTrackId,
          roster_id: membership.rosterId,
          program_membership_id:
            roster.program_membership_id ?? membership.programMembershipId ?? null,
          created_at: now,
          updated_at: now,
        };
      })
      .filter(Boolean);

    if (membershipPayload.length > 0) {
      const { data: insertedMemberships, error: membershipInsertError } = await supabase
        .from("rotation_track_memberships")
        .insert(membershipPayload)
        .select("id");

      if (membershipInsertError) {
        throw new Error(
          `Failed to import rotation track memberships: ${membershipInsertError.message}`
        );
      }

      createdMembershipsCount = (insertedMemberships ?? []).length;
    }
  }

  return {
    createdTracksCount: createdTracks.length,
    createdBlocksCount,
    createdMembershipsCount,
    skippedRosterIds: Array.from(new Set(skippedRosterIds)),
  };
}

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return startA <= endB && endA >= startB;
}

export async function generateRotationAssignmentsFromTracks(
  supabase: SupabaseClient,
  input: GenerateRotationAssignmentsInput
) {
  const { rangeStart, rangeEnd } = getAcademicYearMeta(input.academicYearStart);
  const batchId = crypto.randomUUID();

  let trackQuery = supabase
    .from("rotation_tracks")
    .select(`
      id,
      program_id,
      academic_year_start,
      name,
      description,
      target_pgy_year,
      sort_order,
      is_active,
      copied_from_track_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .eq("program_id", input.programId)
    .eq("academic_year_start", input.academicYearStart);

  if (input.trackIds?.length) {
    trackQuery = trackQuery.in("id", input.trackIds);
  } else {
    trackQuery = trackQuery.eq("is_active", true);
  }

  const { data: trackData, error: trackError } = await trackQuery;

  if (trackError) {
    throw new Error(`Failed to load rotation tracks for generation: ${trackError.message}`);
  }

  const tracks = ((trackData ?? []) as RotationTrackRow[]).map(mapTrack);
  const trackIds = tracks.map((track) => track.id);

  if (trackIds.length === 0) {
    return {
      batchId,
      createdCount: 0,
      deletedCount: 0,
      skippedCount: 0,
      conflicts: [] as GenerateAssignmentsConflict[],
      rangeStart,
      rangeEnd,
    };
  }

  const [blocks, memberships] = await Promise.all([
    listRotationTrackBlocks(supabase, {
      programId: input.programId,
      academicYearStart: input.academicYearStart,
    }),
    listRotationTrackMemberships(supabase, {
      programId: input.programId,
      academicYearStart: input.academicYearStart,
      effectiveDate: rangeStart,
    }),
  ]);

  const blocksByTrackId = new Map<string, RotationTrackBlockItem[]>();
  for (const block of blocks) {
    if (!trackIds.includes(block.trackId)) continue;
    const existing = blocksByTrackId.get(block.trackId) ?? [];
    existing.push(block);
    blocksByTrackId.set(block.trackId, existing);
  }

  const membershipsByTrackId = new Map<string, RotationTrackMembershipItem[]>();
  for (const membership of memberships) {
    if (!trackIds.includes(membership.trackId)) continue;
    const existing = membershipsByTrackId.get(membership.trackId) ?? [];
    existing.push(membership);
    membershipsByTrackId.set(membership.trackId, existing);
  }

  let deletedCount = 0;

  if (input.mode === "overwrite_generated") {
    let deleteQuery = supabase
      .from("rotation_assignments")
      .delete()
      .eq("program_id", input.programId)
      .eq("source_kind", "generated_from_track")
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart);

    if (input.trackIds?.length) {
      deleteQuery = deleteQuery.in("track_id", input.trackIds);
    }

    const { data: deletedRows, error: deleteError } = await deleteQuery.select("id");

    if (deleteError) {
      throw new Error(`Failed to clear generated assignments: ${deleteError.message}`);
    }

    deletedCount = (deletedRows ?? []).length;
  }

  const rosterIds = Array.from(
    new Set(
      memberships
        .filter((membership) => trackIds.includes(membership.trackId))
        .map((membership) => membership.rosterId)
    )
  );

  let existingAssignments: RotationAssignmentOverlapRow[] = [];

  if (rosterIds.length > 0) {
    const { data, error } = await supabase
      .from("rotation_assignments")
      .select(`
        id,
        roster_id,
        program_membership_id,
        rotation_id,
        start_date,
        end_date,
        track_id,
        track_block_id,
        source_kind
      `)
      .eq("program_id", input.programId)
      .in("roster_id", rosterIds)
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart);

    if (error) {
      throw new Error(`Failed to load existing assignments: ${error.message}`);
    }

    existingAssignments = (data ?? []) as RotationAssignmentOverlapRow[];
  }

  const conflicts: GenerateAssignmentsConflict[] = [];
  const insertPayload: Array<Record<string, unknown>> = [];

  for (const track of tracks) {
    const trackBlocks = blocksByTrackId.get(track.id) ?? [];
    const trackMembers = membershipsByTrackId.get(track.id) ?? [];

    for (const member of trackMembers) {
      for (const block of trackBlocks) {
        const overlappingAssignment = existingAssignments.find(
          (assignment) =>
            assignment.roster_id === member.rosterId &&
            assignment.start_date &&
            assignment.end_date &&
            rangesOverlap(
              assignment.start_date,
              assignment.end_date,
              block.startDate,
              block.endDate
            )
        );

        if (overlappingAssignment) {
          conflicts.push({
            rosterId: member.rosterId,
            trackId: track.id,
            trackBlockId: block.id,
            startDate: block.startDate,
            endDate: block.endDate,
            reason: "Overlapping assignment already exists for this roster member.",
            existingAssignmentId: overlappingAssignment.id,
          });
          continue;
        }

        insertPayload.push({
          program_id: input.programId,
          roster_id: member.rosterId,
          program_membership_id:
            member.programMembershipId ?? member.member?.programMembershipId ?? null,
          rotation_id: block.rotationId,
          start_date: block.startDate,
          end_date: block.endDate,
          site_label: block.siteLabel ?? null,
          team_label: block.teamLabel ?? null,
          notes: block.notes ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.createdBy ?? null,
          track_id: track.id,
          track_block_id: block.id,
          source_kind: "generated_from_track",
          source_batch_id: batchId,
        });

        existingAssignments.push({
          id: `pending:${member.rosterId}:${block.id}`,
          roster_id: member.rosterId,
          program_membership_id:
            member.programMembershipId ?? member.member?.programMembershipId ?? null,
          rotation_id: block.rotationId,
          start_date: block.startDate,
          end_date: block.endDate,
          track_id: track.id,
          track_block_id: block.id,
          source_kind: "generated_from_track",
        });
      }
    }
  }

  let createdCount = 0;

  if (insertPayload.length > 0) {
    const { data, error } = await supabase
      .from("rotation_assignments")
      .insert(insertPayload)
      .select("id");

    if (error) {
      throw new Error(`Failed to generate rotation assignments: ${error.message}`);
    }

    createdCount = (data ?? []).length;
  }

  return {
    batchId,
    createdCount,
    deletedCount,
    skippedCount: conflicts.length,
    conflicts,
    rangeStart,
    rangeEnd,
  };
}

export async function getRotationSettingsOverviewData(
  supabase: SupabaseClient,
  params: {
    programId: string;
    academicYearStart: number;
    canManageRotationSettings: boolean;
  }
) {
  const { programId, academicYearStart } = params;
  const { rangeStart, rangeEnd, academicYearLabel } = getAcademicYearMeta(academicYearStart);

  const [program, members, rotations, tracks, trackBlocks, trackMemberships, assignments] =
    await Promise.all([
      getProgramById(supabase, programId),
      listProgramMembers(supabase, programId, rangeStart),
      listProgramRotations(supabase, programId),
      listRotationTracks(supabase, { programId, academicYearStart }),
      listRotationTrackBlocks(supabase, { programId, academicYearStart }),
      listRotationTrackMemberships(supabase, {
        programId,
        academicYearStart,
        effectiveDate: rangeStart,
      }),
      getProgramRotationAssignmentsInRange(programId, rangeStart, rangeEnd),
    ]);

  return {
    program,
    academicYearStart,
    academicYearLabel,
    members,
    rotations,
    tracks,
    trackBlocks,
    trackMemberships,
    assignments,
    permissions: {
      canManageRotationSettings: params.canManageRotationSettings,
    },
  };
}
