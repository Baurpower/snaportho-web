import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveMembershipForUser } from '@/lib/db/memberships'
import { getMonthlyCoverageForProgram } from '@/lib/db/coverage'

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

    if (!membership?.program_id) {
      return NextResponse.json(
        { error: 'No active program found' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const monthStart = searchParams.get('monthStart')
    const monthEnd = searchParams.get('monthEnd')

    if (!monthStart || !monthEnd) {
      return NextResponse.json(
        { error: 'monthStart and monthEnd are required' },
        { status: 400 }
      )
    }

    const result = await getMonthlyCoverageForProgram(
      membership.program_id,
      monthStart,
      monthEnd
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}