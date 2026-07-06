import { NextRequest, NextResponse } from "next/server";
import { getMobileBearerUser } from "@/app/api/mobile/_utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import {
  parseRequestedProgramId,
  resolveNotificationProgramScope,
} from "@/lib/workspace/notifications/access";
import { markNotificationRead } from "@/lib/workspace/notifications/queries";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { notificationId } = await context.params;
  if (!notificationId) {
    return NextResponse.json(
      { error: "Missing notification id." },
      { status: 400 }
    );
  }

  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

  try {
    const { programId } = await resolveNotificationProgramScope({
      userId: user.id,
      requestedProgramId: parseRequestedProgramId(request.nextUrl.searchParams),
    });

    const item = await markNotificationRead(createAdminClient(), {
      notificationId,
      userId: user.id,
      programId,
    });

    if (!item) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[mobile/notifications/read] error", {
      userId: user.id.slice(0, 8),
      notificationId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}