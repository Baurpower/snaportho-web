import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'
import { getRotationAssignmentsForMemberInRange } from '@/lib/db/rotations'
import { getCallAssignmentsForMembershipInRange } from '@/lib/db/calls'
import { getScheduleEventsForUserInRange } from '@/lib/db/schedule-events'

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeRotationRow(
  rotation:
    | {
        id?: string | null
        name?: string | null
        short_name?: string | null
        category?: string | null
        color?: string | null
      }
    | {
        id?: string | null
        name?: string | null
        short_name?: string | null
        category?: string | null
        color?: string | null
      }[]
    | null
) {
  if (!rotation) return null
  if (Array.isArray(rotation)) return rotation[0] ?? null
  return rotation
}

/**
 * Returns the graduation year of the current chief class.
 *
 * Examples:
 * - Jan 2026 -> 2026
 * - Jun 2026 -> 2026
 * - Jul 2026 -> 2027
 * - Oct 2026 -> 2027
 */
function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear()
  const julyFirst = new Date(year, 6, 1)
  return date >= julyFirst ? year + 1 : year
}

/**
 * Assumes grad_year is the resident's graduation year.
 *
 * Examples:
 * - Jan 2026: grad 2026 -> PGY-5
 * - Jan 2026: grad 2027 -> PGY-4
 * - Jan 2026: grad 2030 -> PGY-1
 * - Oct 2026: grad 2027 -> PGY-5
 */
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const monthStart = searchParams.get('monthStart')
    const monthEnd = searchParams.get('monthEnd')

    if (!isValidDateString(monthStart) || !isValidDateString(monthEnd)) {
      return NextResponse.json(
        {
          error: 'monthStart and monthEnd are required in YYYY-MM-DD format',
        },
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

    const membership = await getActiveMembershipForUser(user.id)

    if (!membership) {
      return NextResponse.json(
        {
          monthStart,
          monthEnd,
          membership: null,
          rotations: [],
          calls: [],
          events: [],
        },
        { status: 200 }
      )
    }

    const derivedPgyYear = getPgyFromGradYear(membership.grad_year)
    const derivedTrainingLevel = derivedPgyYear ? `PGY-${derivedPgyYear}` : null

    const [rotations, calls, events] = await Promise.all([
      getRotationAssignmentsForMemberInRange(
        {
          membershipId: membership.id,
          rosterId: membership.roster_id ?? null,
        },
        monthStart,
        monthEnd
      ),
      getCallAssignmentsForMembershipInRange(membership.id, monthStart, monthEnd),
      getScheduleEventsForUserInRange(user.id, monthStart, monthEnd),
    ])

    return NextResponse.json(
      {
        monthStart,
        monthEnd,
        membership: {
          id: membership.id,
          rosterId: membership.roster_id ?? null,
          displayName: membership.display_name ?? null,
          gradYear: membership.grad_year ?? null,
          pgyYear: derivedPgyYear,
          trainingLevel: derivedTrainingLevel,
        },
        rotations: rotations.map((item) => {
          const rotation = normalizeRotationRow(item.rotations)

          return {
            id: item.id,
            startDate: item.start_date,
            endDate: item.end_date,
            siteLabel: item.site_label,
            teamLabel: item.team_label,
            notes: item.notes,
            rotation: rotation
              ? {
                  id: rotation.id ?? null,
                  name: rotation.name ?? null,
                  shortName: rotation.short_name ?? null,
                  category: rotation.category ?? null,
                  color: rotation.color ?? null,
                }
              : null,
          }
        }),
        calls: calls.map((item) => ({
          id: item.id,
          callType: item.call_type,
          callDate: item.call_date,
          startDatetime: item.start_datetime,
          endDatetime: item.end_datetime,
          site: item.site,
          isHomeCall: item.is_home_call,
          notes: item.notes,
        })),
        events: events.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          eventDate: item.event_date,
          startTime: item.start_time,
          endTime: item.end_time,
          isAllDay: item.is_all_day,
          location: item.location,
          description: item.description,
          attending: item.attending,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}