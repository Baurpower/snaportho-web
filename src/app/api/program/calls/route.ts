import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  createProgramCallAssignments,
  ProgramCallScheduleValidationError,
  ProgramCallValidationError,
} from '@/lib/workspace/call/calls'
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from '@/lib/workspace/access-control'

type ProgramCallInputRow = {
  rosterId?: string
  membershipId?: string
  dates?: string[]
  callType?: string
  site?: string | null
  isHomeCall?: boolean
  notes?: string | null
}

type CreateProgramCallsBody = {
  rows?: ProgramCallInputRow[]
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
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

    const access = await requireWorkspacePermission({
      userId: user.id,
      permission: "canEditCallAssignments",
    })

    const body = (await request.json()) as CreateProgramCallsBody

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: 'rows is required' }, { status: 400 })
    }

    for (const row of body.rows) {
      if (!row.rosterId && !row.membershipId) {
        return NextResponse.json(
          { error: 'each row must include rosterId (or legacy membershipId)' },
          { status: 400 }
        )
      }

      if (!Array.isArray(row.dates) || row.dates.length === 0) {
        return NextResponse.json(
          { error: 'each row must include dates' },
          { status: 400 }
        )
      }

      if (!row.dates.every(isValidDateString)) {
        return NextResponse.json(
          { error: 'each row date must be YYYY-MM-DD' },
          { status: 400 }
        )
      }

      if (!row.callType?.trim()) {
        return NextResponse.json(
          { error: 'each row must include callType' },
          { status: 400 }
        )
      }
    }

    const created = await createProgramCallAssignments({
      programId: access.accessContext.programId,
      createdBy: user.id,
      rows: body.rows.map((row) => ({
        rosterId: row.rosterId ?? row.membershipId!,
        membershipId: row.membershipId ?? null,
        dates: row.dates!,
        callType: row.callType!,
        site: row.site ?? null,
        isHomeCall: row.isHomeCall ?? false,
        notes: row.notes ?? null,
      })),
    })

    return NextResponse.json({ calls: created }, { status: 201 })
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof ProgramCallScheduleValidationError) {
      return NextResponse.json(
        {
          error: 'Schedule validation failed',
          issues: error.issues,
          validation: error.validation,
        },
        { status: 400 }
      )
    }

    if (error instanceof ProgramCallValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const message =
      error instanceof Error ? error.message : 'Unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
