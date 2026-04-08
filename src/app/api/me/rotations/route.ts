import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'
import { getLightweightRotationAssignmentsForMemberInRange } from '@/lib/db/rotations'

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

type RawRotationTimelineItem = {
  id: string
  title: string
  startDate: string
  endDate: string
  color: string | null
  rotationId: string | null
  siteLabel: string | null
  teamLabel: string | null
}

type MergedRotationTimelineItem = {
  id: string
  title: string
  startDate: string
  endDate: string
  color: string | null
  rotationId: string | null
  siteLabel: string | null
  teamLabel: string | null
}

function toLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && endA >= startB
}

function getRotationMergeKey(item: RawRotationTimelineItem): string {
  if (item.rotationId) return `rotation:${item.rotationId}`
  return `title:${item.title.trim().toLowerCase()}`
}

function mergeRotationTimelineItems(
  items: RawRotationTimelineItem[]
): MergedRotationTimelineItem[] {
  const sorted = items
    .slice()
    .sort((a, b) => {
      const keyA = getRotationMergeKey(a)
      const keyB = getRotationMergeKey(b)

      if (keyA !== keyB) return keyA.localeCompare(keyB)
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
      return a.endDate.localeCompare(b.endDate)
    })

  const merged: MergedRotationTimelineItem[] = []

  for (const item of sorted) {
    const last = merged[merged.length - 1]

    if (!last) {
      merged.push({ ...item })
      continue
    }

    const sameRotationKey =
      getRotationMergeKey(last as RawRotationTimelineItem) === getRotationMergeKey(item)

    const lastEnd = toLocalDate(last.endDate)
    const nextStart = toLocalDate(item.startDate)

    const contiguousOrOverlapping =
      nextStart.getTime() <= addDays(lastEnd, 1).getTime()

    if (sameRotationKey && contiguousOrOverlapping) {
      if (item.endDate > last.endDate) {
        last.endDate = item.endDate
      }

      if (!last.color && item.color) {
        last.color = item.color
      }

      if (!last.rotationId && item.rotationId) {
        last.rotationId = item.rotationId
      }

      if (!last.siteLabel && item.siteLabel) {
        last.siteLabel = item.siteLabel
      }

      if (!last.teamLabel && item.teamLabel) {
        last.teamLabel = item.teamLabel
      }

      continue
    }

    merged.push({ ...item })
  }

  return merged.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

function getExpandedFetchWindow(start: string, end: string) {
  const requestedStart = toLocalDate(start)
  const requestedEnd = toLocalDate(end)

  const expandedStart = startOfMonth(addMonths(requestedStart, -3))
  const expandedEnd = endOfMonth(addMonths(requestedEnd, 3))

  return {
    fetchStart: toDateKey(expandedStart),
    fetchEnd: toDateKey(expandedEnd),
  }
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
 * - Oct 2025: grad 2026 -> PGY-5
 * - Jan 2026: grad 2026 -> PGY-5
 * - Jan 2026: grad 2027 -> PGY-4
 * - Jan 2026: grad 2030 -> PGY-1
 * - Aug 2026: grad 2027 -> PGY-5
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

    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!isValidDateString(start) || !isValidDateString(end)) {
      return NextResponse.json(
        {
          error: 'start and end are required in YYYY-MM-DD format',
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getActiveMembershipForUser(user.id)

    if (!membership) {
      return NextResponse.json(
        { error: 'No active membership found for user' },
        { status: 404 }
      )
    }

    const derivedPgyYear = getPgyFromGradYear(membership.grad_year)
    const derivedTrainingLevel = derivedPgyYear ? `PGY-${derivedPgyYear}` : null

    const { fetchStart, fetchEnd } = getExpandedFetchWindow(start, end)

    const rotations = await getLightweightRotationAssignmentsForMemberInRange(
      {
        membershipId: membership.id,
        rosterId: membership.roster_id ?? null,
      },
      fetchStart,
      fetchEnd
    )

    const rawTimelineItems: RawRotationTimelineItem[] = rotations
      .filter((item) => item.start_date && item.end_date)
      .map((item) => ({
        id: item.id,
        title:
          item.rotations?.short_name ??
          item.rotations?.name ??
          item.team_label ??
          item.site_label ??
          'Rotation',
        startDate: item.start_date!,
        endDate: item.end_date!,
        color: item.rotations?.color ?? null,
        rotationId: item.rotations?.id ?? null,
        siteLabel: item.site_label ?? null,
        teamLabel: item.team_label ?? null,
      }))

    const mergedRotations = mergeRotationTimelineItems(rawTimelineItems)

    const visibleMergedRotations = mergedRotations.filter((item) =>
      rangesOverlap(item.startDate, item.endDate, start, end)
    )

    return NextResponse.json({
      start,
      end,
      fetchStart,
      fetchEnd,
      membership: {
        id: membership.id,
        rosterId: membership.roster_id ?? null,
        displayName: membership.display_name ?? null,
        gradYear: membership.grad_year ?? null,
        pgyYear: derivedPgyYear,
        trainingLevel: derivedTrainingLevel,
      },
      rotations: visibleMergedRotations.map((item) => ({
        id: item.id,
        title: item.title,
        startDate: item.startDate,
        endDate: item.endDate,
        color: item.color,
        siteLabel: item.siteLabel,
        teamLabel: item.teamLabel,
        rotation: item.rotationId
          ? {
              id: item.rotationId,
              name: item.title,
              shortName: item.title,
              color: item.color,
            }
          : null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load rotations',
      },
      { status: 500 }
    )
  }
}