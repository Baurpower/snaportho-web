import { createClient } from '@/utils/supabase/server'

type LiteRotationRow = {
  id: string
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  rotations:
    | {
        name: string | null
        short_name: string | null
        color: string | null
      }
    | {
        name: string | null
        short_name: string | null
        color: string | null
      }[]
    | null
}

type LiteCallRow = {
  id: string
  call_date: string | null
  call_type: string | null
  site: string | null
}

type LiteScheduleEventRow = {
  id: string
  title: string | null
  category: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  attending: string | null
}

export type WeekLiteDay = {
  date: string
  dayKey: string
  primaryLabel: string | null
  dayCategory: 'OR' | 'Clinic' | 'Custom' | null
  customTitle: string | null
  location: string | null
  attending: string | null
  rotationPill: string | null
  rotationColor: string | null
  hasCall: boolean
  callLabel: string | null
}

export type WeekLiteResponse = {
  weekStart: string
  weekEnd: string
  days: WeekLiteDay[]
}

type GetWeekLiteInput = {
  membershipId: string
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

function normalizeRotationRow(
  rotations: LiteRotationRow['rotations']
): { name: string | null; short_name: string | null; color: string | null } | null {
  if (!rotations) return null
  if (Array.isArray(rotations)) return rotations[0] ?? null
  return rotations
}

function getRotationForDate(
  rotations: LiteRotationRow[],
  date: string
): LiteRotationRow | null {
  return (
    rotations.find(
      (rotation) =>
        rotation.start_date !== null &&
        rotation.end_date !== null &&
        rotation.start_date <= date &&
        rotation.end_date >= date
    ) ?? null
  )
}

function getCallsForDate(calls: LiteCallRow[], date: string): LiteCallRow[] {
  return calls.filter((call) => call.call_date === date)
}

function eventTouchesDate(event: LiteScheduleEventRow, date: string): boolean {
  return event.event_date === date
}

function getScheduleEventsForDate(
  events: LiteScheduleEventRow[],
  date: string
): LiteScheduleEventRow[] {
  return events.filter((event) => eventTouchesDate(event, date))
}

function pickDayEvent(events: LiteScheduleEventRow[]): LiteScheduleEventRow | null {
  if (events.length === 0) return null

  const normalized = events.map((event) => ({
    ...event,
    normalizedCategory: (event.category ?? '').trim().toLowerCase(),
  }))

  const orEvent = normalized.find((event) => event.normalizedCategory === 'or')
  if (orEvent) return orEvent

  const clinicEvent = normalized.find(
    (event) => event.normalizedCategory === 'clinic'
  )
  if (clinicEvent) return clinicEvent

  const customEvent = normalized.find(
    (event) => event.normalizedCategory === 'custom'
  )
  if (customEvent) return customEvent

  return normalized[0]
}

function resolveDayCategory(
  event: LiteScheduleEventRow | null
): WeekLiteDay['dayCategory'] {
  if (!event?.category) return null

  const normalized = event.category.trim().toLowerCase()

  if (normalized === 'or') return 'OR'
  if (normalized === 'clinic') return 'Clinic'
  if (normalized === 'custom') return 'Custom'

  return null
}

function resolvePrimaryLabel(
  event: LiteScheduleEventRow | null
): string | null {
  if (!event) return null

  const normalized = (event.category ?? '').trim().toLowerCase()

  if (normalized === 'custom') {
    return event.title?.trim() || null
  }

  if (normalized === 'or') return 'OR'
  if (normalized === 'clinic') return 'Clinic'

  return event.title?.trim() || null
}

function resolveCustomTitle(
  event: LiteScheduleEventRow | null
): string | null {
  if (!event) return null

  const normalized = (event.category ?? '').trim().toLowerCase()
  if (normalized !== 'custom') return null

  return event.title?.trim() || null
}

export async function getWeekLiteForMembership(
  input: GetWeekLiteInput
): Promise<WeekLiteResponse> {
  const { membershipId, userId, weekStart, weekEnd } = input
  const supabase = await createClient()

  const [
    { data: rotationsData, error: rotationsError },
    { data: callsData, error: callsError },
    { data: scheduleEventsData, error: scheduleEventsError },
  ] = await Promise.all([
    supabase
      .from('rotation_assignments')
      .select(`
        id,
        start_date,
        end_date,
        site_label,
        team_label,
        rotations (
          name,
          short_name,
          color
        )
      `)
      .eq('program_membership_id', membershipId)
      .lte('start_date', weekEnd)
      .gte('end_date', weekStart)
      .order('start_date', { ascending: true }),

    supabase
      .from('call_assignments')
      .select(`
        id,
        call_date,
        call_type,
        site
      `)
      .eq('program_membership_id', membershipId)
      .gte('call_date', weekStart)
      .lte('call_date', weekEnd)
      .order('call_date', { ascending: true }),

    supabase
      .from('schedule_events')
      .select(`
        id,
        title,
        category,
        event_date,
        start_time,
        end_time,
        location,
        attending
      `)
      .eq('user_id', userId)
      .gte('event_date', weekStart)
      .lte('event_date', weekEnd)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true }),
  ])

  if (rotationsError) {
    throw new Error(`Failed to fetch week-lite rotations: ${rotationsError.message}`)
  }

  if (callsError) {
    throw new Error(`Failed to fetch week-lite calls: ${callsError.message}`)
  }

  if (scheduleEventsError) {
    throw new Error(
      `Failed to fetch week-lite schedule events: ${scheduleEventsError.message}`
    )
  }

  const rotations = (rotationsData ?? []) as LiteRotationRow[]
  const calls = (callsData ?? []) as LiteCallRow[]
  const scheduleEvents = (scheduleEventsData ?? []) as LiteScheduleEventRow[]

  const dates = buildDateRange(weekStart, weekEnd)

  const days: WeekLiteDay[] = dates.map((date) => {
    const rotationAssignment = getRotationForDate(rotations, date)
    const rotationRow = normalizeRotationRow(rotationAssignment?.rotations ?? null)

    const dayCalls = getCallsForDate(calls, date)
    const hasCall = dayCalls.length > 0
    const firstCall = dayCalls[0] ?? null

    const dayEvents = getScheduleEventsForDate(scheduleEvents, date)
    const selectedEvent = pickDayEvent(dayEvents)

    const dayCategory = resolveDayCategory(selectedEvent)
    const customTitle = resolveCustomTitle(selectedEvent)
    const primaryLabel = resolvePrimaryLabel(selectedEvent)

    const rotationPill =
      rotationRow?.short_name ??
      rotationRow?.name ??
      rotationAssignment?.team_label ??
      rotationAssignment?.site_label ??
      null

    return {
      date,
      dayKey: weekdayKey(date),
      primaryLabel,
      dayCategory,
      customTitle,
      location: selectedEvent?.location ?? null,
      attending: selectedEvent?.attending ?? null,
      rotationPill,
      rotationColor: rotationRow?.color ?? null,
      hasCall,
      callLabel: firstCall?.call_type ?? firstCall?.site ?? null,
    }
  })

  return {
    weekStart,
    weekEnd,
    days,
  }
}