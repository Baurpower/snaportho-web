import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import {
  parseRequestedProgramId,
  resolveNotificationProgramScope,
} from "@/lib/workspace/notifications/access";
import { getNotificationsForCurrentUser } from "@/lib/workspace/notifications/queries";

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

    const { programId } = await resolveNotificationProgramScope({
      userId: user.id,
      requestedProgramId: parseRequestedProgramId(request.nextUrl.searchParams),
    });

    const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
    const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? "20");
    const limit =
      Number.isInteger(limitValue) && limitValue > 0
        ? Math.min(limitValue, 100)
        : 20;

    const items = await getNotificationsForCurrentUser(createAdminClient(), {
      userId: user.id,
      programId,
      unreadOnly,
      limit,
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load notifications",
      },
      { status: 500 }
    );
  }
}