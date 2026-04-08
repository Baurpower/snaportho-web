import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getAcademicYear(date = new Date()): number {
  const year = date.getFullYear()
  const julyFirst = new Date(year, 6, 1)
  return date >= julyFirst ? year + 1 : year
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null

  const academicYear = getAcademicYear(date)

  const pgy = gradYear - academicYear + 1

  if (pgy < 1 || pgy > 5) return null
  return pgy
}

type ProgramMembershipRelation = {
  id: string
  display_name: string | null
  grad_year: number | null
  user_id: string | null
  program_id?: string | null
}

type ProgramCallRow = {
  id: string
  program_membership_id: string | null
  call_type: string | null
  call_date: string | null
  start_datetime: string | null
  end_datetime: string | null
  site: string | null
  is_home_call: boolean | null
  notes: string | null
  program_memberships: ProgramMembershipRelation | ProgramMembershipRelation[] | null
}

function normalizeMembership(
  value: ProgramCallRow['program_memberships']
): ProgramMembershipRelation | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const monthStart = searchParams.get('monthStart')
    const monthEnd = searchParams.get('monthEnd')

    if (!isValidDateString(monthStart) || !isValidDateString(monthEnd)) {
      return NextResponse.json(
        { error: 'monthStart and monthEnd are required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    if (monthStart > monthEnd) {
      return NextResponse.json(
        { error: 'monthStart must be on or before monthEnd' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const activeMembership = await getActiveMembershipForUser(user.id)

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        {
          monthStart,
          monthEnd,
          myMembershipId: null,
          calls: [],
        },
        { status: 200 }
      )
    }

    const startIso = `${monthStart}T00:00:00.000Z`
    const endIso = `${monthEnd}T23:59:59.999Z`

    const { data: timedCalls, error: timedError } = await supabase
      .from('call_assignments')
      .select(`
        id,
        program_membership_id,
        call_type,
        call_date,
        start_datetime,
        end_datetime,
        site,
        is_home_call,
        notes,
        program_memberships!inner (
          id,
          display_name,
          grad_year,
          user_id,
          program_id
        )
      `)
      .eq('program_memberships.program_id', activeMembership.program_id)
      .not('start_datetime', 'is', null)
      .lte('start_datetime', endIso)
      .gte('end_datetime', startIso)
      .order('start_datetime', { ascending: true })

    if (timedError) {
      throw new Error(`Failed to fetch timed program calls: ${timedError.message}`)
    }

    const { data: dateOnlyCalls, error: dateOnlyError } = await supabase
      .from('call_assignments')
      .select(`
        id,
        program_membership_id,
        call_type,
        call_date,
        start_datetime,
        end_datetime,
        site,
        is_home_call,
        notes,
        program_memberships!inner (
          id,
          display_name,
          grad_year,
          user_id,
          program_id
        )
      `)
      .eq('program_memberships.program_id', activeMembership.program_id)
      .is('start_datetime', null)
      .gte('call_date', monthStart)
      .lte('call_date', monthEnd)
      .order('call_date', { ascending: true })

    if (dateOnlyError) {
      throw new Error(`Failed to fetch date-only program calls: ${dateOnlyError.message}`)
    }

    const merged = [
      ...((timedCalls ?? []) as unknown as ProgramCallRow[]),
      ...((dateOnlyCalls ?? []) as unknown as ProgramCallRow[]),
    ]
    const deduped = Array.from(new Map(merged.map((row) => [row.id, row])).values())

    return NextResponse.json(
      {
        monthStart,
        monthEnd,
        myMembershipId: activeMembership.id,
        calls: deduped.map((row) => {
          const membership = normalizeMembership(row.program_memberships)
          const gradYear = membership?.grad_year ?? null
          const pgyYear = getPgyFromGradYear(gradYear)
          const trainingLevel = pgyYear ? `PGY-${pgyYear}` : null

          return {
            id: row.id,
            membershipId: row.program_membership_id,
            residentName: membership?.display_name ?? 'Unknown Resident',
            gradYear,
            pgyYear,
            trainingLevel,
            userId: membership?.user_id ?? null,
            callType: row.call_type,
            callDate: row.call_date ?? row.start_datetime?.slice(0, 10) ?? null,
            startDatetime: row.start_datetime,
            endDatetime: row.end_datetime,
            site: row.site,
            isHomeCall: row.is_home_call,
            notes: row.notes,
            isMine: row.program_membership_id === activeMembership.id,
          }
        }),
      },
      { status: 200 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}