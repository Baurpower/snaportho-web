import { createClient } from '@/utils/supabase/server'

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

export type DeleteCallAssignmentInput = {
  callId: string
  programId: string
}

export type ProgramResidentOption = {
  rosterId: string
  membershipId: string | null
  displayName: string
  gradYear: number | null
  userId: string | null
}

export type ProgramResidentCallStats = {
  membershipId: string
  rosterId: string | null
  totalCallsYear: number
  weekendCallsYear: number
  primaryCallsYear: number
  backupCallsYear: number
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

  const rosterIds = Array.from(
    new Set(input.rows.map((row) => row.rosterId).filter(Boolean))
  )

  const membershipByRosterId = new Map<string, string | null>()

  if (rosterIds.length > 0) {
    const { data: rosterRows, error: rosterError } = await supabase
      .from('program_roster')
      .select('id, program_membership_id')
      .eq('program_id', input.programId)
      .in('id', rosterIds)

    if (rosterError) {
      throw new Error(`Failed to validate roster rows: ${rosterError.message}`)
    }

    for (const row of rosterRows ?? []) {
      membershipByRosterId.set(String(row.id), row.program_membership_id ?? null)
    }
  }

  const rowsToInsert = input.rows.flatMap((row) => {
    const uniqueDates = dedupeDates(row.dates)
    const mappedMembershipId =
      row.membershipId ?? membershipByRosterId.get(row.rosterId) ?? null

    return uniqueDates.map((date) => ({
      program_id: input.programId,
      roster_id: row.rosterId,
      program_membership_id: mappedMembershipId,
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
  programId: string
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

  return rows.map((row) => ({
    rosterId: row.id,
    membershipId: row.program_membership_id ?? null,
    displayName:
      row.full_name ??
      [row.first_name, row.last_name].filter(Boolean).join(' ') ??
      'Unknown Resident',
    gradYear: row.grad_year ?? null,
    userId: row.claimed_by_user_id ?? null,
  }))
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
      membershipId: rosterId,
      rosterId,
      totalCallsYear: 0,
      weekendCallsYear: 0,
      primaryCallsYear: 0,
      backupCallsYear: 0,
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

    entry.totalCallsYear += 1

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
