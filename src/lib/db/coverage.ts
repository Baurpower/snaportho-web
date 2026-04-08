import { createClient } from '@/utils/supabase/server'

export type MonthlyCoverageResident = {
  membershipId: string | null
  rosterId: string | null
  resident: string
  level: string
  service: string | null
  startDate: string | null
  endDate: string | null
  gradYear: number | null
  pgyYear: number | null
}

export type MonthlyCoverageGroup = {
  rotationId: string | null
  rotation: string
  shortName: string | null
  category: string | null
  color: string | null
  residents: MonthlyCoverageResident[]
}

export type MonthlyCoverageResponse = {
  monthStart: string
  monthEnd: string
  groups: MonthlyCoverageGroup[]
}

type CoverageMembership = {
  id: string
  display_name: string | null
  grad_year: number | null
  roster_id?: string | null
}

type CoverageRoster = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  grad_year: number | null
}

type CoverageRotation = {
  id: string | null
  name: string | null
  short_name: string | null
  category: string | null
  color: string | null
  sort_order: number | null
}

type CoverageAssignmentRow = {
  id: string
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  notes: string | null
  program_memberships: CoverageMembership | CoverageMembership[] | null
  program_roster: CoverageRoster | CoverageRoster[] | null
  rotations: CoverageRotation | CoverageRotation[] | null
}

function normalizeMembership(
  membership: CoverageMembership | CoverageMembership[] | null
): CoverageMembership | null {
  if (!membership) return null
  if (Array.isArray(membership)) return membership[0] ?? null
  return membership
}

function normalizeRoster(
  roster: CoverageRoster | CoverageRoster[] | null
): CoverageRoster | null {
  if (!roster) return null
  if (Array.isArray(roster)) return roster[0] ?? null
  return roster
}

function normalizeRotation(
  rotation: CoverageRotation | CoverageRotation[] | null
): CoverageRotation | null {
  if (!rotation) return null
  if (Array.isArray(rotation)) return rotation[0] ?? null
  return rotation
}

function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear()
  const julyFirst = new Date(year, 6, 1)
  return date >= julyFirst ? year + 1 : year
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null

  const currentChiefGradYear = getCurrentChiefGradYear(date)
  const pgy = 5 - (gradYear - currentChiefGradYear)

  if (pgy < 1 || pgy > 5) return null
  return pgy
}

function deriveLevel(gradYear: number | null): string {
  const pgyYear = getPgyFromGradYear(gradYear)
  if (pgyYear !== null) return `PGY-${pgyYear}`
  return 'Resident'
}

function deriveService(row: CoverageAssignmentRow): string | null {
  const rotation = normalizeRotation(row.rotations)
  return row.team_label ?? row.site_label ?? rotation?.category ?? null
}

function deriveResidentName(row: CoverageAssignmentRow): string {
  const membership = normalizeMembership(row.program_memberships)
  const roster = normalizeRoster(row.program_roster)

  if (membership?.display_name?.trim()) {
    return membership.display_name.trim()
  }

  if (roster?.full_name?.trim()) {
    return roster.full_name.trim()
  }

  const first = roster?.first_name?.trim() ?? ''
  const last = roster?.last_name?.trim() ?? ''
  const combined = `${first} ${last}`.trim()

  if (combined) return combined

  return 'Unknown Resident'
}

export async function getMonthlyCoverageForProgram(
  programId: string,
  monthStart: string,
  monthEnd: string
): Promise<MonthlyCoverageResponse> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rotation_assignments')
    .select(`
      id,
      start_date,
      end_date,
      site_label,
      team_label,
      notes,
      program_memberships (
        id,
        display_name,
        grad_year,
        roster_id
      ),
      program_roster (
        id,
        full_name,
        first_name,
        last_name,
        grad_year
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
    .eq('program_id', programId)
    .lte('start_date', monthEnd)
    .gte('end_date', monthStart)
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch monthly coverage: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as CoverageAssignmentRow[]

  const grouped = new Map<string, MonthlyCoverageGroup>()

  for (const row of rows) {
    const membership = normalizeMembership(row.program_memberships)
    const roster = normalizeRoster(row.program_roster)
    const rotation = normalizeRotation(row.rotations)

    const gradYear = membership?.grad_year ?? roster?.grad_year ?? null
    const pgyYear = getPgyFromGradYear(gradYear)

    const rotationKey = rotation?.id ?? `unknown-${row.id}`

    if (!grouped.has(rotationKey)) {
      grouped.set(rotationKey, {
        rotationId: rotation?.id ?? null,
        rotation: rotation?.name ?? 'Unknown Rotation',
        shortName: rotation?.short_name ?? null,
        category: rotation?.category ?? null,
        color: rotation?.color ?? null,
        residents: [],
      })
    }

    grouped.get(rotationKey)!.residents.push({
      membershipId: membership?.id ?? null,
      rosterId: roster?.id ?? membership?.roster_id ?? null,
      resident: deriveResidentName(row),
      level: deriveLevel(gradYear),
      service: deriveService(row),
      startDate: row.start_date,
      endDate: row.end_date,
      gradYear,
      pgyYear,
    })
  }

  const groups = Array.from(grouped.values()).sort((a, b) =>
    a.rotation.localeCompare(b.rotation)
  )

  return {
    monthStart,
    monthEnd,
    groups,
  }
}