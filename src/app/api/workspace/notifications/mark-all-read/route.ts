import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import {
  parseRequestedProgramId,
  resolveNotificationProgramScope,
} from "@/lib/workspace/notifications/access";
import { markAllNotificationsRead } from "@/lib/workspace/notifications/queries";

export async function POST(request: NextRequest) {
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

    const result = await markAllNotificationsRead(createAdminClient(), {
      userId: user.id,
      programId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark notifications as read",
      },
      { status: 500 }
    );
  }
}