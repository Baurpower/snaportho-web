import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  deleteScheduleEvent,
  updateScheduleEvent,
} from '@/lib/db/schedule-events'

type UpdateBody = {
  title?: string
  category?: 'or' | 'clinic' | 'custom'
  date?: string
  eventDate?: string
  isAllDay?: boolean
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  description?: string | null
  attending?: string | null
  selected?: boolean
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
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

    const body = (await request.json()) as UpdateBody

    const normalizedDate = body.eventDate ?? body.date

    if (body.category && !['or', 'clinic', 'custom'].includes(body.category)) {
      return NextResponse.json(
        { error: 'category must be one of: or, clinic, custom' },
        { status: 400 }
      )
    }

    if (normalizedDate && !isValidDateString(normalizedDate)) {
      return NextResponse.json(
        { error: 'date must be YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (body.startTime && !isValidTimeString(body.startTime)) {
      return NextResponse.json(
        { error: 'startTime must be HH:MM' },
        { status: 400 }
      )
    }

    if (body.endTime && !isValidTimeString(body.endTime)) {
      return NextResponse.json(
        { error: 'endTime must be HH:MM' },
        { status: 400 }
      )
    }

    if (body.selected === false) {
      await deleteScheduleEvent(eventId, user.id)
      return NextResponse.json({ success: true, deleted: true }, { status: 200 })
    }

    const updated = await updateScheduleEvent({
      eventId,
      userId: user.id,
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      category: body.category,
      date: normalizedDate,
      isAllDay: body.isAllDay,
      startTime: body.isAllDay ? null : body.startTime,
      endTime: body.isAllDay ? null : body.endTime,
      location:
        body.location === undefined ? undefined : (body.location?.trim() || null),
      description:
        body.description === undefined
          ? undefined
          : (body.description?.trim() || null),
      attending:
        body.attending === undefined ? undefined : (body.attending?.trim() || null),
    })

    return NextResponse.json({ event: updated }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
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

    await deleteScheduleEvent(eventId, user.id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}