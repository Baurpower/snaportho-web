import {
  getRotationAssignmentsForMemberInRange,
  type RotationAssignmentSummary,
} from '@/lib/db/rotations'
import {
  getCallAssignmentsForMembershipInRange,
  type CallAssignmentSummary,
} from '@/lib/db/calls'
import {
  getScheduleEventsForUserInRange,
  type ScheduleEventSummary,
} from '@/lib/db/schedule-events'

export type WeekScheduleDay = {
  date: string
  dayKey: string
  rotation: {
    id: string
    name: string | null
    shortName: string | null
    category: string | null
    color: string | null
    siteLabel: string | null
    teamLabel: string | null
    notes: string | null
  } | null
  calls: Array<{
    id: string
    callType: string | null
    callDate: string | null
    startDatetime: string | null
    endDatetime: string | null
    site: string | null
    isHomeCall: boolean | null
    notes: string | null
  }>
  scheduleEvents: Array<{
    id: string
    title: string | null
    category: string | null
    eventDate: string | null
    startTime: string | null
    endTime: string | null
    isAllDay: boolean | null
    location: string | null
    description: string | null
    attending: string | null
  }>
  dayCategory: 'OR' | 'Clinic' | 'OFF' | 'Custom'
  primaryLabel: string
  primaryType: 'rotation' | 'call' | 'off'
}

export type WeekScheduleResponse = {
  weekStart: string
  weekEnd: string
  days: WeekScheduleDay[]
}

type GetWeekScheduleForMembershipInput = {
  membershipId: string
  rosterId: string | null
  userId: string
  weekStart: string
  weekEnd: string
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  while (current <= end) {
    dates.push(toDateOnlyString(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

function weekdayKey(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}

function eventTouchesDate(event: ScheduleEventSummary, date: string): boolean {
  return event.event_date === date
}

function mapRotation(
  assignment: RotationAssignmentSummary | null
): WeekScheduleDay['rotation'] {
  if (!assignment) return null

  const rotationRow = assignment.rotations ?? null

  return {
    id: assignment.id,
    name: rotationRow?.name ?? null,
    shortName: rotationRow?.short_name ?? null,
    category: rotationRow?.category ?? null,
    color: rotationRow?.color ?? null,
    siteLabel: assignment.site_label,
    teamLabel: assignment.team_label,
    notes: assignment.notes,
  }
}

function mapCalls(calls: CallAssignmentSummary[]): WeekScheduleDay['calls'] {
  return calls.map((call) => ({
    id: call.id,
    callType: call.call_type,
    callDate: call.call_date,
    startDatetime: call.start_datetime,
    endDatetime: call.end_datetime,
    site: call.site,
    isHomeCall: call.is_home_call,
    notes: call.notes,
  }))
}

function mapScheduleEvents(
  events: ScheduleEventSummary[]
): WeekScheduleDay['scheduleEvents'] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    isAllDay: event.is_all_day,
    location: event.location,
    description: event.description,
    attending: event.attending,
  }))
}

function resolveDayCategory(
  events: ScheduleEventSummary[]
): WeekScheduleDay['dayCategory'] {
  const normalizedCategories = events
    .map((event) => (event.category ?? '').trim().toLowerCase())
    .filter(Boolean)

  if (normalizedCategories.includes('or')) return 'OR'
  if (normalizedCategories.includes('clinic')) return 'Clinic'

  const customTitles = events
    .filter((event) => (event.category ?? '').trim().toLowerCase() === 'custom')
    .map((event) => (event.title ?? '').trim().toLowerCase())

  const hasOffLikeCustom = customTitles.some((title) =>
    /(^off$|vacation|pto|post[- ]?call|holiday|away)/i.test(title)
  )

  if (hasOffLikeCustom) return 'OFF'
  if (normalizedCategories.includes('custom')) return 'Custom'

  return 'OFF'
}

function pickPrimaryLabel(params: {
  rotation: WeekScheduleDay['rotation']
  calls: WeekScheduleDay['calls']
  dayCategory: WeekScheduleDay['dayCategory']
  scheduleEvents: WeekScheduleDay['scheduleEvents']
}): { primaryLabel: string; primaryType: WeekScheduleDay['primaryType'] } {
  const { rotation, calls, dayCategory, scheduleEvents } = params

  if (rotation) {
    return {
      primaryLabel:
        rotation.shortName ??
        rotation.name ??
        rotation.teamLabel ??
        rotation.siteLabel ??
        'Rotation',
      primaryType: 'rotation',
    }
  }

  if (dayCategory === 'OR' || dayCategory === 'Clinic' || dayCategory === 'Custom') {
    const firstEventTitle =
      scheduleEvents.find((event) => event.title?.trim())?.title ?? dayCategory

    return {
      primaryLabel: firstEventTitle,
      primaryType: 'rotation',
    }
  }

  if (calls.length > 0) {
    return {
      primaryLabel: calls[0].callType ?? calls[0].site ?? 'Call',
      primaryType: 'call',
    }
  }

  return {
    primaryLabel: 'Off',
    primaryType: 'off',
  }
}

export async function getWeekScheduleForMembership(
  input: GetWeekScheduleForMembershipInput
): Promise<WeekScheduleResponse> {
  const { membershipId, rosterId, userId, weekStart, weekEnd } = input

  const [rotations, calls, scheduleEvents] = await Promise.all([
    getRotationAssignmentsForMemberInRange(
      {
        membershipId,
        rosterId,
      },
      weekStart,
      weekEnd
    ),
    getCallAssignmentsForMembershipInRange(membershipId, weekStart, weekEnd),
    getScheduleEventsForUserInRange(userId, weekStart, weekEnd),
  ])

  const dates = buildDateRange(weekStart, weekEnd)

  const days: WeekScheduleDay[] = dates.map((date) => {
    const matchingRotation =
      rotations.find(
        (assignment) =>
          assignment.start_date !== null &&
          assignment.end_date !== null &&
          assignment.start_date <= date &&
          assignment.end_date >= date
      ) ?? null

    const matchingCalls = calls.filter((call) => {
      const callDate =
        call.call_date ??
        call.start_datetime?.slice(0, 10) ??
        null

      return callDate === date
    })

    const matchingScheduleEvents = scheduleEvents.filter((event) =>
      eventTouchesDate(event, date)
    )

    const rotation = mapRotation(matchingRotation)
    const mappedCalls = mapCalls(matchingCalls)
    const mappedScheduleEvents = mapScheduleEvents(matchingScheduleEvents)
    const dayCategory = resolveDayCategory(matchingScheduleEvents)

    const { primaryLabel, primaryType } = pickPrimaryLabel({
      rotation,
      calls: mappedCalls,
      dayCategory,
      scheduleEvents: mappedScheduleEvents,
    })

    return {
      date,
      dayKey: weekdayKey(date),
      rotation,
      calls: mappedCalls,
      scheduleEvents: mappedScheduleEvents,
      dayCategory,
      primaryLabel,
      primaryType,
    }
  })

  return {
    weekStart,
    weekEnd,
    days,
  }
}