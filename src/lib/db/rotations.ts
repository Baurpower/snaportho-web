import { createClient } from '@/utils/supabase/server'

type RotationRelation = {
  id: string
  name: string | null
  short_name: string | null
  category?: string | null
  color: string | null
}

export type RotationAssignmentSummary = {
  id: string
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  notes: string | null
  rotations: {
    id: string
    name: string | null
    short_name: string | null
    category: string | null
    color: string | null
  } | null
}

export type LightweightRotationAssignment = {
  id: string
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  rotations: {
    id: string
    name: string | null
    short_name: string | null
    color: string | null
  } | null
}

type RawRotationAssignmentSummaryRow = {
  id: string
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  notes: string | null
  rotations: RotationRelation | RotationRelation[] | null
}

type RawLightweightRotationAssignmentRow = {
  id: string
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  rotations: RotationRelation | RotationRelation[] | null
}

type RotationLookupIdentity = {
  membershipId?: string | null
  rosterId?: string | null
}

function normalizeRotation(
  rotation: RotationRelation | RotationRelation[] | null
): RotationRelation | null {
  if (!rotation) return null
  if (Array.isArray(rotation)) return rotation[0] ?? null
  return rotation
}

function toRotationAssignmentSummary(
  row: RawRotationAssignmentSummaryRow
): RotationAssignmentSummary {
  const rotation = normalizeRotation(row.rotations)

  return {
    id: row.id,
    start_date: row.start_date,
    end_date: row.end_date,
    site_label: row.site_label,
    team_label: row.team_label,
    notes: row.notes,
    rotations: rotation
      ? {
          id: rotation.id,
          name: rotation.name ?? null,
          short_name: rotation.short_name ?? null,
          category: rotation.category ?? null,
          color: rotation.color ?? null,
        }
      : null,
  }
}

function toLightweightRotationAssignment(
  row: RawLightweightRotationAssignmentRow
): LightweightRotationAssignment {
  const rotation = normalizeRotation(row.rotations)

  return {
    id: row.id,
    start_date: row.start_date,
    end_date: row.end_date,
    site_label: row.site_label,
    team_label: row.team_label,
    rotations: rotation
      ? {
          id: rotation.id,
          name: rotation.name ?? null,
          short_name: rotation.short_name ?? null,
          color: rotation.color ?? null,
        }
      : null,
  }
}

function applyAssignmentIdentityFilter<T extends { or: (filter: string) => T }>(
  query: T,
  identity: RotationLookupIdentity
): T {
  const filters: string[] = []

  if (identity.membershipId) {
    filters.push(`program_membership_id.eq.${identity.membershipId}`)
  }

  if (identity.rosterId) {
    filters.push(`roster_id.eq.${identity.rosterId}`)
  }

  if (filters.length === 0) {
    throw new Error('A membershipId or rosterId is required to fetch rotation assignments.')
  }

  return query.or(filters.join(','))
}

export async function getCurrentRotationForMember(
  identity: RotationLookupIdentity,
  today: string
): Promise<RotationAssignmentSummary | null> {
  const supabase = await createClient()

  let query = supabase
    .from('rotation_assignments')
    .select(`
      id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      rotations (
        id,
        name,
        short_name,
        category,
        color
      )
    `)

  query = applyAssignmentIdentityFilter(query, identity)

  const { data, error } = await query
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch current rotation: ${error.message}`)
  }

  if (!data) return null
  return toRotationAssignmentSummary(data as unknown as RawRotationAssignmentSummaryRow)
}

export async function getNextRotationForMember(
  identity: RotationLookupIdentity,
  today: string
): Promise<RotationAssignmentSummary | null> {
  const supabase = await createClient()

  let query = supabase
    .from('rotation_assignments')
    .select(`
      id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      rotations (
        id,
        name,
        short_name,
        category,
        color
      )
    `)

  query = applyAssignmentIdentityFilter(query, identity)

  const { data, error } = await query
    .gt('start_date', today)
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch next rotation: ${error.message}`)
  }

  if (!data) return null
  return toRotationAssignmentSummary(data as unknown as RawRotationAssignmentSummaryRow)
}

export async function getRotationAssignmentsForMemberInRange(
  identity: RotationLookupIdentity,
  rangeStart: string,
  rangeEnd: string
): Promise<RotationAssignmentSummary[]> {
  const supabase = await createClient()

  let query = supabase
    .from('rotation_assignments')
    .select(`
      id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      rotations (
        id,
        name,
        short_name,
        category,
        color
      )
    `)

  query = applyAssignmentIdentityFilter(query, identity)

  const { data, error } = await query
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch rotation assignments in range: ${error.message}`)
  }

  return ((data ?? []) as unknown as RawRotationAssignmentSummaryRow[]).map(
    toRotationAssignmentSummary
  )
}

export async function getLightweightRotationAssignmentsForMemberInRange(
  identity: RotationLookupIdentity,
  rangeStart: string,
  rangeEnd: string
): Promise<LightweightRotationAssignment[]> {
  const supabase = await createClient()

  let query = supabase
    .from('rotation_assignments')
    .select(`
      id,
      start_date,
      end_date,
      site_label,
      team_label,
      rotations (
        id,
        name,
        short_name,
        color
      )
    `)

  query = applyAssignmentIdentityFilter(query, identity)

  const { data, error } = await query
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch lightweight rotation assignments in range: ${error.message}`)
  }

  return ((data ?? []) as unknown as RawLightweightRotationAssignmentRow[]).map(
    toLightweightRotationAssignment
  )
}

type ProgramMembershipRelation = {
  id: string
  display_name: string | null
  grad_year: number | null
  role: string | null
  user_id: string | null
  roster_id?: string | null
  program_id?: string | null
}

type RawProgramRotationAssignmentRow = {
  id: string
  program_membership_id: string | null
  roster_id: string | null
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  notes: string | null
  program_memberships: ProgramMembershipRelation | ProgramMembershipRelation[] | null
  rotations: RotationRelation | RotationRelation[] | null
}

export type ProgramRotationAssignment = {
  id: string
  membershipId: string | null
  rosterId: string | null
  memberName: string | null
  gradYear: number | null
  role: string | null
  userId: string | null
  startDate: string | null
  endDate: string | null
  siteLabel: string | null
  teamLabel: string | null
  notes: string | null
  rotation: {
    id: string
    name: string | null
    short_name: string | null
    category: string | null
    color: string | null
  } | null
}

function normalizeProgramMembership(
  membership: ProgramMembershipRelation | ProgramMembershipRelation[] | null
): ProgramMembershipRelation | null {
  if (!membership) return null
  if (Array.isArray(membership)) return membership[0] ?? null
  return membership
}

function toProgramRotationAssignment(
  row: RawProgramRotationAssignmentRow
): ProgramRotationAssignment {
  const membership = normalizeProgramMembership(row.program_memberships)
  const rotation = normalizeRotation(row.rotations)

  return {
    id: row.id,
    membershipId: row.program_membership_id,
    rosterId: row.roster_id,
    memberName: membership?.display_name ?? null,
    gradYear: membership?.grad_year ?? null,
    role: membership?.role ?? null,
    userId: membership?.user_id ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    siteLabel: row.site_label,
    teamLabel: row.team_label,
    notes: row.notes,
    rotation: rotation
      ? {
          id: rotation.id,
          name: rotation.name ?? null,
          short_name: rotation.short_name ?? null,
          category: rotation.category ?? null,
          color: rotation.color ?? null,
        }
      : null,
  }
}

export async function getProgramRotationAssignmentsInRange(
  programId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ProgramRotationAssignment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rotation_assignments')
    .select(`
      id,
      program_membership_id,
      roster_id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      program_memberships!inner (
        id,
        display_name,
        grad_year,
        role,
        user_id,
        roster_id,
        program_id
      ),
      rotations (
        id,
        name,
        short_name,
        category,
        color
      )
    `)
    .eq('program_memberships.program_id', programId)
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch program rotation assignments: ${error.message}`)
  }

  return ((data ?? []) as unknown as RawProgramRotationAssignmentRow[]).map(
    toProgramRotationAssignment
  )
}