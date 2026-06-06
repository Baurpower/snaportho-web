import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  PROGRAM_CALL_DRAFT_SCHEMA_VERSION,
  normalizeDraftAssignments,
  normalizeProgramCallScheduleDraftPayload,
} from "@/lib/workspace/call/drafts";
import {
  requireWorkspacePermission,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";

type DraftRow = {
  id: string;
  month_start: string;
  draft_payload: unknown;
  schema_version: number;
  published_schedule_updated_at: string | null;
  updated_at: string;
};

function isValidMonthStart(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getMonthEnd(monthStart: string) {
  const [year, month] = monthStart.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, month, 0));
  return monthEnd.toISOString().slice(0, 10);
}

async function getLatestPublishedScheduleUpdatedAt(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  programId: string;
  monthStart: string;
}) {
  const monthEnd = getMonthEnd(params.monthStart);
  const { data, error } = await params.supabase
    .from("call_assignments")
    .select("updated_at")
    .eq("program_id", params.programId)
    .gte("call_date", params.monthStart)
    .lte("call_date", monthEnd)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load published schedule metadata: ${error.message}`);
  }

  return data?.updated_at ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const access = await requireWorkspacePermission({
      userId: user.id,
      permission: "canUploadCallSchedule",
    });

    const monthStart = request.nextUrl.searchParams.get("monthStart");
    if (!isValidMonthStart(monthStart)) {
      return NextResponse.json(
        { error: "monthStart is required in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("program_call_schedule_drafts")
      .select(
        "id, month_start, draft_payload, schema_version, published_schedule_updated_at, updated_at"
      )
      .eq("program_id", access.accessContext.programId)
      .eq("user_id", user.id)
      .eq("month_start", monthStart)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load call draft: ${error.message}`);
    }

    const latestPublishedScheduleUpdatedAt =
      await getLatestPublishedScheduleUpdatedAt({
        supabase,
        programId: access.accessContext.programId,
        monthStart,
      });

    const row = (data as DraftRow | null) ?? null;
    const payload = normalizeProgramCallScheduleDraftPayload(row?.draft_payload ?? null);

    if (!row || !payload || row.schema_version !== PROGRAM_CALL_DRAFT_SCHEMA_VERSION) {
      return NextResponse.json(
        {
          draft: null,
          hasDraft: false,
          latestPublishedScheduleUpdatedAt,
          invalidDraftFound: Boolean(row),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasDraft: true,
        latestPublishedScheduleUpdatedAt,
        draft: {
          id: row.id,
          monthStart: row.month_start,
          schemaVersion: row.schema_version,
          updatedAt: row.updated_at,
          publishedScheduleUpdatedAt: row.published_schedule_updated_at,
          hasPublishedScheduleChangedSinceDraft:
            Boolean(
              row.published_schedule_updated_at &&
                latestPublishedScheduleUpdatedAt &&
                row.published_schedule_updated_at !== latestPublishedScheduleUpdatedAt
            ),
          payload,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load call draft.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const access = await requireWorkspacePermission({
      userId: user.id,
      permission: "canUploadCallSchedule",
    });

    const body = await request.json().catch(() => null);
    const monthStart = isValidMonthStart(body?.monthStart) ? body.monthStart : null;
    const payload = normalizeProgramCallScheduleDraftPayload(body?.payload ?? null);
    const publishedScheduleUpdatedAt =
      typeof body?.publishedScheduleUpdatedAt === "string"
        ? body.publishedScheduleUpdatedAt
        : null;
    // Optimistic-locking token: the updatedAt the client loaded from the last GET/PUT.
    // When present, we reject the save with 409 if the server's current updatedAt differs,
    // preventing one editor from silently overwriting another's concurrent changes.
    const previousDraftUpdatedAt =
      typeof body?.previousDraftUpdatedAt === "string"
        ? body.previousDraftUpdatedAt
        : null;

    if (!monthStart || !payload) {
      return NextResponse.json(
        { error: "monthStart and a valid payload are required." },
        { status: 400 }
      );
    }

    // ── Conflict check ─────────────────────────────────────────────────────────
    if (previousDraftUpdatedAt) {
      const { data: existingRow } = await supabase
        .from("program_call_schedule_drafts")
        .select("updated_at")
        .eq("program_id", access.accessContext.programId)
        .eq("user_id", user.id)
        .eq("month_start", monthStart)
        .maybeSingle();

      if (
        existingRow &&
        existingRow.updated_at !== previousDraftUpdatedAt
      ) {
        return NextResponse.json(
          {
            error:
              "Draft was modified in another session. Reload to review the latest changes.",
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("program_call_schedule_drafts")
      .upsert(
        {
          program_id: access.accessContext.programId,
          user_id: user.id,
          month_start: monthStart,
          draft_payload: {
            ...payload,
            assignments: normalizeDraftAssignments(payload.assignments),
          },
          schema_version: PROGRAM_CALL_DRAFT_SCHEMA_VERSION,
          published_schedule_updated_at: publishedScheduleUpdatedAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "program_id,user_id,month_start",
        }
      )
      .select(
        "id, month_start, draft_payload, schema_version, published_schedule_updated_at, updated_at"
      )
      .single();

    if (error) {
      throw new Error(`Failed to save call draft: ${error.message}`);
    }

    const row = data as DraftRow;
    return NextResponse.json(
      {
        draft: {
          id: row.id,
          monthStart: row.month_start,
          schemaVersion: row.schema_version,
          updatedAt: row.updated_at,
          publishedScheduleUpdatedAt: row.published_schedule_updated_at,
          payload: normalizeProgramCallScheduleDraftPayload(row.draft_payload),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save call draft.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const access = await requireWorkspacePermission({
      userId: user.id,
      permission: "canUploadCallSchedule",
    });

    const monthStart = request.nextUrl.searchParams.get("monthStart");
    if (!isValidMonthStart(monthStart)) {
      return NextResponse.json(
        { error: "monthStart is required in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("program_call_schedule_drafts")
      .delete()
      .eq("program_id", access.accessContext.programId)
      .eq("user_id", user.id)
      .eq("month_start", monthStart);

    if (error) {
      throw new Error(`Failed to delete call draft: ${error.message}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete call draft.",
      },
      { status: 500 }
    );
  }
}
