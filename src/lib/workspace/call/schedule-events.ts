import { createClient } from '@/utils/supabase/server'
import { toHHMM } from './schedule-event-time'

export type ScheduleEventCategory = 'or' | 'clinic' | 'custom'

export type ScheduleEventSummary = {
  id: string
  user_id: string
  title: string | null
  category: ScheduleEventCategory | null
  event_date: string | null
  is_all_day: boolean | null
  start_time: string | null
  end_time: string | null
  location: string | null
  description: string | null
  attending: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CreateScheduleEventsInput = {
  userId: string
  title: string
  category: ScheduleEventCategory
  dates: string[]
  isAllDay?: boolean
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  description?: string | null
  attending?: string | null
}

export type UpdateScheduleEventInput = {
  eventId: string
  userId: string
  title?: string
  category?: ScheduleEventCategory
  date?: string
  isAllDay?: boolean
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  description?: string | null
  attending?: string | null
}

export function mapScheduleEventRow(row: ScheduleEventSummary): ScheduleEventSummary {
  return {
    ...row,
    start_time: toHHMM(row.start_time),
    end_time: toHHMM(row.end_time),
  }
}

export function buildCreateScheduleEventRows(
  input: CreateScheduleEventsInput
): Record<string, unknown>[] {
  const isAllDay = input.isAllDay ?? true

  if (!isAllDay && (!input.startTime || !input.endTime)) {
    throw new Error('Timed events require both a startTime and an endTime')
  }

  return input.dates.map((date) => ({
    user_id: input.userId,
    title: input.title,
    category: input.category,
    event_date: date,
    is_all_day: isAllDay,
    start_time: isAllDay ? null : input.startTime,
    end_time: isAllDay ? null : input.endTime,
    location: input.location ?? null,
    description: input.description ?? null,
    attending: input.attending ?? null,
  }))
}

export function buildUpdateScheduleEventPayload(
  input: UpdateScheduleEventInput
): Record<string, unknown> {
  const updatePayload: Record<string, unknown> = {}

  if (input.title !== undefined) updatePayload.title = input.title
  if (input.category !== undefined) updatePayload.category = input.category
  if (input.location !== undefined) updatePayload.location = input.location
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.attending !== undefined) updatePayload.attending = input.attending
  if (input.date !== undefined) updatePayload.event_date = input.date

  if (input.isAllDay !== undefined) {
    updatePayload.is_all_day = input.isAllDay

    if (input.isAllDay) {
      updatePayload.start_time = null
      updatePayload.end_time = null
    }
  }

  if (input.isAllDay !== true) {
    if (input.startTime !== undefined) {
      updatePayload.start_time = input.startTime
    }
    if (input.endTime !== undefined) {
      updatePayload.end_time = input.endTime
    }
  }

  return updatePayload
}

export async function getScheduleEventsForUserInRange(
  userId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ScheduleEventSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedule_events')
    .select(`
      id,
      user_id,
      title,
      category,
      event_date,
      is_all_day,
      start_time,
      end_time,
      location,
      description,
      attending,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
    .gte('event_date', rangeStart)
    .lte('event_date', rangeEnd)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch schedule events in range: ${error.message}`)
  }

  return ((data ?? []) as ScheduleEventSummary[]).map(mapScheduleEventRow)
}

export async function createScheduleEvents(
  input: CreateScheduleEventsInput
): Promise<ScheduleEventSummary[]> {
  const supabase = await createClient()

  const rows = buildCreateScheduleEventRows(input)

  const { data, error } = await supabase
    .from('schedule_events')
    .insert(rows)
    .select(`
      id,
      user_id,
      title,
      category,
      event_date,
      is_all_day,
      start_time,
      end_time,
      location,
      description,
      attending,
      created_at,
      updated_at
    `)

  if (error) {
    throw new Error(`Failed to create schedule events: ${error.message}`)
  }

  return ((data ?? []) as ScheduleEventSummary[]).map(mapScheduleEventRow)
}

export async function updateScheduleEvent(
  input: UpdateScheduleEventInput
): Promise<ScheduleEventSummary> {
  const supabase = await createClient()

  const updatePayload = buildUpdateScheduleEventPayload(input)
  updatePayload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('schedule_events')
    .update(updatePayload)
    .eq('id', input.eventId)
    .eq('user_id', input.userId)
    .select(`
      id,
      user_id,
      title,
      category,
      event_date,
      is_all_day,
      start_time,
      end_time,
      location,
      description,
      attending,
      created_at,
      updated_at
    `)
    .single()

  if (error) {
    throw new Error(`Failed to update schedule event: ${error.message}`)
  }

  return mapScheduleEventRow(data as ScheduleEventSummary)
}

export async function deleteScheduleEvent(
  eventId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('schedule_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete schedule event: ${error.message}`)
  }
}