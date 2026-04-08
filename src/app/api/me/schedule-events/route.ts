import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createScheduleEvents } from '@/lib/db/schedule-events'

type CreateBody = {
  title?: string
  category?: 'or' | 'clinic' | 'custom'
  dates?: string[]
  isAllDay?: boolean
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  description?: string | null
  attending?: string | null
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
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

    const body = (await request.json()) as CreateBody

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    if (!body.category || !['or', 'clinic', 'custom'].includes(body.category)) {
      return NextResponse.json(
        { error: 'category must be one of: or, clinic, custom' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.dates) || body.dates.length === 0) {
      return NextResponse.json({ error: 'dates is required' }, { status: 400 })
    }

    if (!body.dates.every(isValidDateString)) {
      return NextResponse.json(
        { error: 'each date must be YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const isAllDay = body.isAllDay ?? true

    if (!isAllDay) {
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
    }

    const created = await createScheduleEvents({
      userId: user.id,
      title: body.title.trim(),
      category: body.category,
      dates: body.dates,
      isAllDay,
      startTime: isAllDay ? null : (body.startTime ?? null),
      endTime: isAllDay ? null : (body.endTime ?? null),
      location: body.location?.trim() || null,
      description: body.description?.trim() || null,
      attending: body.attending?.trim() || null,
    })

    return NextResponse.json({ events: created }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}