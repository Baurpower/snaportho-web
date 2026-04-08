import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'
import { getWeekScheduleForMembership } from '@/lib/db/week'

function isValidDateString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const weekStart = searchParams.get('weekStart')
    const weekEnd = searchParams.get('weekEnd')

    if (!isValidDateString(weekStart) || !isValidDateString(weekEnd)) {
      return NextResponse.json(
        { error: 'weekStart and weekEnd are required in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    if (weekStart > weekEnd) {
      return NextResponse.json(
        { error: 'weekStart must be on or before weekEnd' },
        { status: 400 }
      )
    }

    const membership = await getActiveMembershipForUser(user.id)

    if (!membership) {
      return NextResponse.json(
        { error: 'No active membership found' },
        { status: 404 }
      )
    }

    const result = await getWeekScheduleForMembership({
      membershipId: membership.id,
      rosterId: membership.roster_id ?? null,
      userId: user.id,
      weekStart,
      weekEnd,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}