import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'
import { getProgramCallStatsForMonth } from '@/lib/db/calls'

function isValidMonthString(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}$/.test(value)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    if (!isValidMonthString(month)) {
      return NextResponse.json(
        { error: 'month is required in YYYY-MM format' },
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

    if (!membership?.program_id) {
      return NextResponse.json({ residentStats: [] }, { status: 200 })
    }

    const residentStats = await getProgramCallStatsForMonth(
      membership.program_id,
      month
    )

    return NextResponse.json({ residentStats }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to load call stats',
      },
      { status: 500 }
    )
  }
}