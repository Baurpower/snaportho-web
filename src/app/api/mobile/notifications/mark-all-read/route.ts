import { NextRequest, NextResponse } from "next/server";
import { getMobileBearerUser } from "@/app/api/mobile/_utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import {
  parseRequestedProgramId,
  resolveNotificationProgramScope,
} from "@/lib/workspace/notifications/access";
import { markAllNotificationsRead } from "@/lib/workspace/notifications/queries";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

  try {
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

    console.error("[mobile/notifications/mark-all-read] error", {
      userId: user.id.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}