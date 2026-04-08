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
  membershipId: string
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
  membershipId: string
  displayName: string
  gradYear: number | null
  userId: string | null
}

export type ProgramResidentCallStats = {
  membershipId: string
  totalCallsYear: number
  weekendCallsYear: number
  primaryCallsYear: number
  backupCallsYear: number
}

type ProgramMembershipResidentRow = {
  id: string
  display_name: string | null
  grad_year: number | null
  user_id: string | null
}

type ProgramMembershipIdRow = {
  id: string
}

type ProgramCallStatRow = {
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

  const rowsToInsert = input.rows.flatMap((row) => {
    const uniqueDates = dedupeDates(row.dates)

    return uniqueDates.map((date) => ({
      program_id: input.programId,
      program_membership_id: row.membershipId,
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
    .from('program_memberships')
    .select(`
      id,
      display_name,
      grad_year,
      user_id
    `)
    .eq('program_id', programId)
    .eq('is_active', true)
    .order('grad_year', { ascending: true, nullsFirst: false })
    .order('display_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch program residents: ${error.message}`)
  }

  const rows = (data ?? []) as ProgramMembershipResidentRow[]

  return rows.map((row) => ({
    membershipId: row.id,
    displayName: row.display_name ?? 'Unknown Resident',
    gradYear: row.grad_year ?? null,
    userId: row.user_id ?? null,
  }))
}

export async function getProgramCallStatsForMonth(
  programId: string,
  month: string
): Promise<ProgramResidentCallStats[]> {
  const supabase = await createClient()
  const { yearStart, yearEnd } = getYearStartAndEndFromMonth(month)

  const { data: memberships, error: membershipsError } = await supabase
    .from('program_memberships')
    .select('id')
    .eq('program_id', programId)

  if (membershipsError) {
    throw new Error(`Failed to fetch program memberships: ${membershipsError.message}`)
  }

  const membershipRows = (memberships ?? []) as ProgramMembershipIdRow[]
  const membershipIds = membershipRows.map((row) => row.id)

  if (membershipIds.length === 0) {
    return []
  }

  const { data: calls, error: callsError } = await supabase
    .from('call_assignments')
    .select(`
      program_membership_id,
      call_type,
      call_date,
      start_datetime
    `)
    .in('program_membership_id', membershipIds)
    .gte('call_date', yearStart)
    .lte('call_date', yearEnd)

  if (callsError) {
    throw new Error(`Failed to fetch program call stats: ${callsError.message}`)
  }

  const callRows = (calls ?? []) as ProgramCallStatRow[]

  const statsMap = new Map<string, ProgramResidentCallStats>()

  for (const membershipId of membershipIds) {
    statsMap.set(membershipId, {
      membershipId,
      totalCallsYear: 0,
      weekendCallsYear: 0,
      primaryCallsYear: 0,
      backupCallsYear: 0,
    })
  }

  for (const row of callRows) {
    const membershipId = row.program_membership_id
    if (!membershipId) continue

    const entry = statsMap.get(membershipId)
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