import { createClient } from '@/utils/supabase/server'
import { loadProgramCallValidationContext } from '@/lib/workspace/call/rule-loader'
import {
  type EffectiveDateInput,
  getResidentStatusDetails,
  type ResidentStatusLabel,
} from '@/lib/workspace/pgy'
import {
  buildResidentIdentityMaps,
  getCanonicalResidentId,
} from '@/lib/workspace/call/resident-identity'
import {
  serializeSlotId,
  type CallDraftAssignment,
  type CallValidationIssue,
  type CallValidationResult,
  validateCallMonthDraft,
} from '@/lib/workspace/call/validation'

export type CallAssignmentSummary = {
  id: string
  program_id?: string | null
  program_membership_id?: string | null
  call_type: string | null
  call_date: string | null
  start_datetime: string | null
  end_datetime: string | null
  site: string | null
  is_home_call: boolean | null
  notes: string | null
  created_by?: string | null
}

export type CreateCallAssignmentsForMembershipInput = {
  programId: string
  membershipId: string
  createdBy: string
  dates: string[]
  callType: string
  site?: string | null
  isHomeCall?: boolean | null
  notes?: string | null
}

export type CreateProgramCallAssignmentRow = {
  rosterId: string
  membershipId?: string | null
  dates: string[]
  callType: string
  site?: string | null
  isHomeCall?: boolean | null
  notes?: string | null
}

export type CreateProgramCallAssignmentsInput = {
  programId: string
  createdBy: string
  rows: CreateProgramCallAssignmentRow[]
}

export const CALL_ASSIGNMENT_EDITOR_ROLES = new Set([
  'admin',
  'program_admin',
  'chief',
  'chief_resident',
  'faculty',
  'faculty_lead',
  'resident',
])

export class ProgramCallValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProgramCallValidationError'
  }
}

export class ProgramCallScheduleValidationError extends Error {
  validation: CallValidationResult
  issues: CallValidationIssue[]

  constructor(validation: CallValidationResult) {
    super('Schedule validation failed')
    this.name = 'ProgramCallScheduleValidationError'
    this.validation = validation
    this.issues = validation.errors
  }
}

export type DeleteCallAssignmentInput = {
  callId: string
  programId: string
}

export type ProgramResidentOption = {
  residentId: string
  rosterId: string
  membershipId: string | null
  displayName: string
  gradYear: number | null
  residentStatus: ResidentStatusLabel
  pgyYear: number | null
  isGraduated: boolean
  isActiveResident: boolean
  graduationDate: string | null
  userId: string | null
}

type GetProgramResidentsOptions = {
  effectiveDate?: EffectiveDateInput
  includeGraduates?: boolean
}

export type ProgramResidentCallStats = {
  residentId: string
  membershipId: string
  rosterId: string | null
  totalCallsYear: number
  weekendCallsYear: number
  primaryCallsYear: number
  backupCallsYear: number
  buddyCallsYear: number
}

type ProgramRosterResidentRow = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  program_membership_id: string | null
  grad_year: number | null
  claimed_by_user_id: string | null
}

type ProgramCallStatRow = {
  roster_id: string | null
  program_membership_id: string | null
  call_type: string | null
  call_date: string | null
  start_datetime: string | null
}

type ProgramRosterIdentityRow = {
  id: string
  program_membership_id: string | null
}

type ProgramCallAssignmentValidationRow = {
  id: string
  roster_id: string | null
  program_membership_id: string | null
  call_type: string | null
  call_date: string | null
  start_datetime: string | null
  end_datetime: string | null
}

export type ProgramCallDraftMutationRow = {
  id?: string | null
  rosterId?: string | null
  programMembershipId?: string | null
  callType?: string | null
  callDate?: string | null
  startDatetime?: string | null
  endDatetime?: string | null
  slotId?: string | null
}

function dedupeDates(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort()
}

function isWeekendDate(dateString: string | null | undefined) {
  if (!dateString) return false
  const date = new Date(`${dateString}T00:00:00`)
  const day = date.getDay()
  return day === 0 || day === 6
}

function getYearStartAndEndFromMonth(month: string) {
  const [year] = month.split('-').map(Number)
  return {
    yearStart: `${year}-01-01`,
    yearEnd: `${year}-12-31`,
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[]
}

function toCallDraftAssignment(
  row: ProgramCallAssignmentValidationRow | ProgramCallDraftMutationRow
): CallDraftAssignment {
  const id = row.id ?? null
  const callDate =
    'call_date' in row ? row.call_date ?? null : row.callDate ?? null
  const callType =
    'call_type' in row ? row.call_type ?? null : row.callType ?? null
  const rosterId =
    'roster_id' in row ? row.roster_id ?? null : row.rosterId ?? null
  const programMembershipId =
    'program_membership_id' in row
      ? row.program_membership_id ?? null
      : row.programMembershipId ?? null
  const startDatetime =
    'start_datetime' in row
      ? row.start_datetime ?? null
      : row.startDatetime ?? null
  const endDatetime =
    'end_datetime' in row ? row.end_datetime ?? null : row.endDatetime ?? null
  const slotId = 'slotId' in row ? row.slotId ?? null : null

  return {
    id,
    callId: id,
    residentId: rosterId,
    membershipId: rosterId,
    rosterId,
    programMembershipId,
    callDate,
    dateKey: callDate,
    callType,
    startDatetime,
    endDatetime,
    slotId:
      slotId ??
      (callDate && callType
        ? serializeSlotId({
            dateKey: callDate,
            callType,
          })
        : null),
  }
}

async function getProgramCallAssignmentsForDates(
  programId: string,
  dates: string[]
) {
  const supabase = await createClient()
  const uniqueDates = uniqueStrings(dates)

  if (uniqueDates.length === 0) {
    return [] as ProgramCallAssignmentValidationRow[]
  }

  const { data, error } = await supabase
    .from('call_assignments')
    .select(
      'id, roster_id, program_membership_id, call_type, call_date, start_datetime, end_datetime'
    )
    .eq('program_id', programId)
    .in('call_date', uniqueDates)

  if (error) {
    throw new Error(`Failed to load program calls for validation: ${error.message}`)
  }

  return (data ?? []) as ProgramCallAssignmentValidationRow[]
}

export async function validateProgramCallMutationDraft(params: {
  programId: string
  touchedDates: string[]
  upserts?: ProgramCallDraftMutationRow[]
  deleteCallIds?: string[]
}) {
  const uniqueTouchedDates = uniqueStrings(params.touchedDates)
  const validationDateStart = uniqueTouchedDates[0] ?? null
  const validationDateEnd =
    uniqueTouchedDates.length > 0
      ? uniqueTouchedDates[uniqueTouchedDates.length - 1]
      : null
  const validationContext = await loadProgramCallValidationContext(
    params.programId,
    null,
    {
      dateStart: validationDateStart,
      dateEnd: validationDateEnd,
    }
  )
  const existingRows = await getProgramCallAssignmentsForDates(
    params.programId,
    params.touchedDates
  )
  const { residentIdByProgramMembershipId } = buildResidentIdentityMaps(
    validationContext.residents
  )

  const deleteIds = new Set(uniqueStrings(params.deleteCallIds ?? []))
  const upserts = (params.upserts ?? []).map((row, index) => ({
    ...row,
    id: row.id ?? `draft-${index}-${row.callDate ?? 'unknown'}-${row.callType ?? 'unknown'}`,
  }))
  const upsertIds = new Set(
    uniqueStrings(upserts.map((row) => row.id ?? null))
  )

  const remainingAssignments = existingRows
    .filter((row) => !deleteIds.has(row.id) && !upsertIds.has(row.id))
    .map(toCallDraftAssignment)

  const nextAssignments = [
    ...remainingAssignments,
    ...upserts.map(toCallDraftAssignment),
  ].map((assignment) => {
    const residentIdFromAssignment =
      getCanonicalResidentId({
        residentId: assignment.residentId,
        rosterId: assignment.rosterId,
        membershipId: assignment.membershipId,
      }) ?? null
    const residentId =
      residentIdFromAssignment ??
      (assignment.programMembershipId
        ? residentIdByProgramMembershipId.get(assignment.programMembershipId) ??
          null
        : null)

    return {
      ...assignment,
      residentId,
      membershipId: residentId,
      rosterId: residentId ?? assignment.rosterId ?? null,
    }
  })

  if (process.env.NODE_ENV !== 'production') {
    const assignmentResidentIds = nextAssignments
      .map((assignment) => assignment.rosterId ?? assignment.residentId ?? null)
      .filter((value): value is string => Boolean(value))
    const loadedRosterIds = validationContext.residents
      .map((resident) => resident.rosterId ?? resident.residentId ?? null)
      .filter((value): value is string => Boolean(value))

    console.info('[call-validation-draft]', {
      source: 'validateProgramCallMutationDraft',
      programId: params.programId,
      touchedDates: uniqueTouchedDates,
      assignmentResidentIds,
      loadedRosterCount: loadedRosterIds.length,
      loadedRosterIds,
      clientScope: 'admin',
      timestamp: new Date().toISOString(),
    })
  }

  return validateCallMonthDraft({
    assignments: nextAssignments,
    rules: validationContext.rules,
    residents: validationContext.residents,
    timeOff: validationContext.timeOff,
    rotations: validationContext.rotations,
    context: {
      rules: validationContext.rules,
      residents: validationContext.residents,
      timeOff: validationContext.timeOff,
      rotations: validationContext.rotations,
      metadata: {
        ...validationContext.programContext,
        touchedDates: uniqueTouchedDates,
      },
    },
  })
}

export async function assertValidProgramCallMutationDraft(params: {
  programId: string
  touchedDates: string[]
  upserts?: ProgramCallDraftMutationRow[]
  deleteCallIds?: string[]
}) {
  const validation = await validateProgramCallMutationDraft(params)

  if (validation.hasErrors) {
    throw new ProgramCallScheduleValidationError(validation)
  }

  return validation
}

export async function resolveProgramRosterTargets(
  programId: string,
  rows: Array<{
    rosterId?: string | null
    membershipId?: string | null
  }>
): Promise<Array<{ rosterId: string; programMembershipId: string | null }>> {
  const supabase = await createClient()

  const rosterIds = Array.from(
    new Set(rows.map((row) => row.rosterId).filter(Boolean))
  ) as string[]
  const membershipIds = Array.from(
    new Set(rows.map((row) => row.membershipId).filter(Boolean))
  ) as string[]

  const rosterById = new Map<string, ProgramRosterIdentityRow>()
  const rosterByMembershipId = new Map<string, ProgramRosterIdentityRow>()

  if (rosterIds.length > 0) {
    const { data, error } = await supabase
      .from('program_roster')
      .select('id, program_membership_id')
      .eq('program_id', programId)
      .in('id', rosterIds)

    if (error) {
      throw new Error(`Failed to validate roster rows: ${error.message}`)
    }

    for (const row of (data ?? []) as ProgramRosterIdentityRow[]) {
      rosterById.set(String(row.id), row)
      if (row.program_membership_id) {
        rosterByMembershipId.set(String(row.program_membership_id), row)
      }
    }
  }

  if (membershipIds.length > 0) {
    const missingMembershipIds = membershipIds.filter(
      (membershipId) => !rosterByMembershipId.has(membershipId)
    )

    if (missingMembershipIds.length > 0) {
      const { data, error } = await supabase
        .from('program_roster')
        .select('id, program_membership_id')
        .eq('program_id', programId)
        .in('program_membership_id', missingMembershipIds)

      if (error) {
        throw new Error(`Failed to validate membership-linked roster rows: ${error.message}`)
      }

      for (const row of (data ?? []) as ProgramRosterIdentityRow[]) {
        rosterById.set(String(row.id), row)
        if (row.program_membership_id) {
          rosterByMembershipId.set(String(row.program_membership_id), row)
        }
      }
    }
  }

  return rows.map((row, index) => {
    const roster =
      (row.rosterId ? rosterById.get(row.rosterId) ?? null : null) ??
      (row.membershipId
        ? rosterByMembershipId.get(row.membershipId) ?? null
        : null)

    if (!roster) {
      throw new ProgramCallValidationError(
        `Row ${index + 1}: resident roster record does not belong to this program`
      )
    }

    if (
      row.membershipId &&
      roster.program_membership_id &&
      row.membershipId !== roster.program_membership_id
    ) {
      throw new ProgramCallValidationError(
        `Row ${index + 1}: resident membership does not match the selected roster row`
      )
    }

    return {
      rosterId: String(roster.id),
      programMembershipId: roster.program_membership_id ?? null,
    }
  })
}

export async function getNextCallForMembership(
  membershipId: string,
  nowIso: string
): Promise<CallAssignmentSummary | null> {
  const supabase = await createClient()
  const today = nowIso.slice(0, 10)

  const { data, error } = await supabase
    .from('call_assignments')
    .select(`
      id,
      program_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime,
      end_datetime,
      site,
      is_home_call,
      notes,
      created_by
    `)
    .eq('program_membership_id', membershipId)
    .or(
      `start_datetime.gte.${nowIso},and(start_datetime.is.null,call_date.gte.${today})`
    )
    .order('call_date', { ascending: true })
    .order('start_datetime', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch next call: ${error.message}`)
  }

  return data as CallAssignmentSummary | null
}

export async function getCallAssignmentsForMembershipInRange(
  membershipId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<CallAssignmentSummary[]> {
  const supabase = await createClient()

  const startIso = `${rangeStart}T00:00:00.000Z`
  const endIso = `${rangeEnd}T23:59:59.999Z`

  const { data: timedCalls, error: timedError } = await supabase
    .from('call_assignments')
    .select(`
      id,
      program_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime,
      end_datetime,
      site,
      is_home_call,
      notes,
      created_by
    `)
    .eq('program_membership_id', membershipId)
    .not('start_datetime', 'is', null)
    .lte('start_datetime', endIso)
    .gte('end_datetime', startIso)
    .order('start_datetime', { ascending: true })

  if (timedError) {
    throw new Error(`Failed to fetch timed calls in range: ${timedError.message}`)
  }

  const { data: dateOnlyCalls, error: dateOnlyError } = await supabase
    .from('call_assignments')
    .select(`
      id,
      program_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime,
      end_datetime,
      site,
      is_home_call,
      notes,
      created_by
    `)
    .eq('program_membership_id', membershipId)
    .is('start_datetime', null)
    .gte('call_date', rangeStart)
    .lte('call_date', rangeEnd)
    .order('call_date', { ascending: true })

  if (dateOnlyError) {
    throw new Error(`Failed to fetch date-only calls in range: ${dateOnlyError.message}`)
  }

  const merged = [...(timedCalls ?? []), ...(dateOnlyCalls ?? [])]
  const deduped = Array.from(new Map(merged.map((row) => [row.id, row])).values())

  return deduped as CallAssignmentSummary[]
}

export async function createCallAssignmentsForMembership(
  input: CreateCallAssignmentsForMembershipInput
): Promise<CallAssignmentSummary[]> {
  const supabase = await createClient()

  const uniqueDates = dedupeDates(input.dates)

  if (uniqueDates.length === 0) {
    return []
  }

  const rows = uniqueDates.map((date) => ({
    program_id: input.programId,
    program_membership_id: input.membershipId,
    call_type: input.callType,
    call_date: date,
    start_datetime: null,
    end_datetime: null,
    site: input.site ?? null,
    is_home_call: input.isHomeCall ?? false,
    notes: input.notes ?? null,
    created_by: input.createdBy,
  }))

  const { data, error } = await supabase
    .from('call_assignments')
    .insert(rows)
    .select(`
      id,
      program_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime,
      end_datetime,
      site,
      is_home_call,
      notes,
      created_by
    `)

  if (error) {
    throw new Error(`Failed to create call assignments: ${error.message}`)
  }

  return (data ?? []) as CallAssignmentSummary[]
}

export async function createProgramCallAssignments(
  input: CreateProgramCallAssignmentsInput
): Promise<CallAssignmentSummary[]> {
  const supabase = await createClient()
  const resolvedTargets = await resolveProgramRosterTargets(
    input.programId,
    input.rows.map((row) => ({
      rosterId: row.rosterId,
      membershipId: row.membershipId ?? null,
    }))
  )

  const rowsToInsert = input.rows.flatMap((row, index) => {
    const uniqueDates = dedupeDates(row.dates)
    const resolvedTarget = resolvedTargets[index]

    return uniqueDates.map((date) => ({
      program_id: input.programId,
      roster_id: resolvedTarget.rosterId,
      program_membership_id: resolvedTarget.programMembershipId,
      call_type: row.callType,
      call_date: date,
      start_datetime: null,
      end_datetime: null,
      site: row.site ?? null,
      is_home_call: row.isHomeCall ?? false,
      notes: row.notes ?? null,
      created_by: input.createdBy,
    }))
  })

  if (rowsToInsert.length === 0) {
    return []
  }

  await assertValidProgramCallMutationDraft({
    programId: input.programId,
    touchedDates: rowsToInsert.map((row) => row.call_date),
    upserts: rowsToInsert.map((row, index) => ({
      id: `create-${index}-${row.call_date ?? 'unknown'}-${row.call_type ?? 'unknown'}`,
      rosterId: row.roster_id,
      programMembershipId: row.program_membership_id,
      callType: row.call_type,
      callDate: row.call_date,
      startDatetime: row.start_datetime,
      endDatetime: row.end_datetime,
    })),
  })

  const { data, error } = await supabase
    .from('call_assignments')
    .insert(rowsToInsert)
    .select(`
      id,
      program_id,
      roster_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime,
      end_datetime,
      site,
      is_home_call,
      notes,
      created_by
    `)

  if (error) {
    throw new Error(`Failed to create program call assignments: ${error.message}`)
  }

  return (data ?? []) as CallAssignmentSummary[]
}

export async function deleteCallAssignment(
  input: DeleteCallAssignmentInput
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('call_assignments')
    .delete()
    .eq('id', input.callId)
    .eq('program_id', input.programId)

  if (error) {
    throw new Error(`Failed to delete call assignment: ${error.message}`)
  }
}

export async function getProgramResidents(
  programId: string,
  options: GetProgramResidentsOptions = {}
): Promise<ProgramResidentOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('program_roster')
    .select(`
      id,
      full_name,
      first_name,
      last_name,
      program_membership_id,
      grad_year,
      claimed_by_user_id
    `)
    .eq('program_id', programId)
    .order('grad_year', { ascending: true, nullsFirst: false })
    .order('last_name', { ascending: true, nullsFirst: false })
    .order('first_name', { ascending: true, nullsFirst: false })

  if (error) {
    throw new Error(`Failed to fetch program residents: ${error.message}`)
  }

  const rows = (data ?? []) as ProgramRosterResidentRow[]
  const includeGraduates = options.includeGraduates ?? true
  const effectiveDate = options.effectiveDate

  return rows
    .map((row) => {
      const status = getResidentStatusDetails(row.grad_year ?? null, effectiveDate)

      return {
        residentId: row.id,
        rosterId: row.id,
        membershipId: row.program_membership_id ?? null,
        displayName:
          row.full_name ??
          [row.first_name, row.last_name].filter(Boolean).join(' ') ??
          'Unknown Resident',
        gradYear: row.grad_year ?? null,
        residentStatus: status.statusLabel,
        pgyYear: status.pgyYear,
        isGraduated: status.isGraduated,
        isActiveResident: status.isActiveResident,
        graduationDate: status.graduationDate,
        userId: row.claimed_by_user_id ?? null,
      }
    })
    .filter((resident) => includeGraduates || resident.isActiveResident)
}

export async function getProgramCallStatsForMonth(
  programId: string,
  month: string
): Promise<ProgramResidentCallStats[]> {
  const supabase = await createClient()
  const { yearStart, yearEnd } = getYearStartAndEndFromMonth(month)

  const { data: rosterRows, error: rosterError } = await supabase
    .from('program_roster')
    .select('id, program_membership_id')
    .eq('program_id', programId)

  if (rosterError) {
    throw new Error(`Failed to fetch program roster rows: ${rosterError.message}`)
  }

  const rosterIds = (rosterRows ?? []).map((row) => String(row.id))
  const rosterByMembershipId = new Map<string, string>()
  for (const row of rosterRows ?? []) {
    if (row.program_membership_id) {
      rosterByMembershipId.set(String(row.program_membership_id), String(row.id))
    }
  }

  if (rosterIds.length === 0) {
    return []
  }

  const { data: calls, error: callsError } = await supabase
    .from('call_assignments')
    .select(`
      roster_id,
      program_membership_id,
      call_type,
      call_date,
      start_datetime
    `)
    .eq('program_id', programId)
    .in('roster_id', rosterIds)
    .gte('call_date', yearStart)
    .lte('call_date', yearEnd)

  if (callsError) {
    throw new Error(`Failed to fetch program call stats: ${callsError.message}`)
  }

  const callRows = (calls ?? []) as ProgramCallStatRow[]

  const statsMap = new Map<string, ProgramResidentCallStats>()

  for (const rosterId of rosterIds) {
    statsMap.set(rosterId, {
      residentId: rosterId,
      membershipId: rosterId,
      rosterId,
      totalCallsYear: 0,
      weekendCallsYear: 0,
      primaryCallsYear: 0,
      backupCallsYear: 0,
      buddyCallsYear: 0,
    })
  }

  for (const row of callRows) {
    const residentKey =
      row.roster_id ??
      (row.program_membership_id
        ? rosterByMembershipId.get(row.program_membership_id) ?? null
        : null)
    if (!residentKey) continue

    const entry = statsMap.get(residentKey)
    if (!entry) continue

    if (row.call_type === 'Buddy') {
      entry.buddyCallsYear += 1
      // Buddy does not count toward totalCallsYear by default.
    } else {
      entry.totalCallsYear += 1
    }

    if (row.call_type === 'Primary') {
      entry.primaryCallsYear += 1
    } else if (row.call_type === 'Backup') {
      entry.backupCallsYear += 1
    }

    const dateString =
      row.call_date ??
      (row.start_datetime?.slice(0, 10) ?? null)

    if (isWeekendDate(dateString)) {
      entry.weekendCallsYear += 1
    }
  }

  return Array.from(statsMap.values())
}

export type GoldenWeekendSummary = {
  friday: string
  saturday: string
  sunday: string
  hasFridayCall: boolean
  hasSaturdayCall: boolean
  hasSundayCall: boolean
  isGoldenWeekend: boolean
}

export type GoldenWeekendsMonthResponse = {
  month: string
  membershipId: string
  goldenWeekendCount: number
  weekends: GoldenWeekendSummary[]
}

function toDateKeyLocal(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysLocal(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function getMonthStartAndEnd(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)

  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new Error('Invalid month format. Expected YYYY-MM')
  }

  const monthStart = `${year}-${String(monthNumber).padStart(2, '0')}-01`
  const monthEndDate = new Date(year, monthNumber, 0)
  const monthEnd = toDateKeyLocal(monthEndDate)

  return { year, monthNumber, monthStart, monthEnd }
}

function getFridaysInMonth(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstDay = new Date(year, monthNumber - 1, 1)
  const lastDay = new Date(year, monthNumber, 0)

  const fridays: string[] = []
  const cursor = new Date(firstDay)

  while (cursor <= lastDay) {
    if (cursor.getDay() === 5) {
      fridays.push(toDateKeyLocal(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return fridays
}

export async function getGoldenWeekendsForMembershipInMonth(
  membershipId: string,
  month: string
): Promise<GoldenWeekendsMonthResponse> {
  const { monthStart, monthEnd } = getMonthStartAndEnd(month)

  const calls = await getCallAssignmentsForMembershipInRange(
    membershipId,
    monthStart,
    monthEnd
  )

  const callDateSet = new Set<string>()

  for (const call of calls) {
    const dateKey =
      call.call_date ??
      (call.start_datetime ? call.start_datetime.slice(0, 10) : null)

    if (dateKey) {
      callDateSet.add(dateKey)
    }
  }

  const fridays = getFridaysInMonth(month)

  const weekends: GoldenWeekendSummary[] = fridays.map((fridayKey) => {
    const fridayDate = new Date(`${fridayKey}T00:00:00`)
    const saturdayKey = toDateKeyLocal(addDaysLocal(fridayDate, 1))
    const sundayKey = toDateKeyLocal(addDaysLocal(fridayDate, 2))

    const hasFridayCall = callDateSet.has(fridayKey)
    const hasSaturdayCall = callDateSet.has(saturdayKey)
    const hasSundayCall = callDateSet.has(sundayKey)

    const isGoldenWeekend =
      !hasFridayCall && !hasSaturdayCall && !hasSundayCall

    return {
      friday: fridayKey,
      saturday: saturdayKey,
      sunday: sundayKey,
      hasFridayCall,
      hasSaturdayCall,
      hasSundayCall,
      isGoldenWeekend,
    }
  })

  return {
    month,
    membershipId,
    goldenWeekendCount: weekends.filter((w) => w.isGoldenWeekend).length,
    weekends,
  }
}
