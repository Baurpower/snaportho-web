import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'
import { getGoldenWeekendsForMembershipInMonth } from '@/lib/db/calls'

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

    const membership = await getActiveMembershipForUser(user.id)

    if (!membership?.id) {
      return NextResponse.json(
        { error: 'No active program membership found' },
        { status: 400 }
      )
    }

    const month = request.nextUrl.searchParams.get('month')

    if (!month) {
      return NextResponse.json(
        { error: 'month is required in YYYY-MM format' },
        { status: 400 }
      )
    }

    const payload = await getGoldenWeekendsForMembershipInMonth(
      membership.id,
      month
    )

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load golden weekends',
      },
      { status: 500 }
    )
  }
}