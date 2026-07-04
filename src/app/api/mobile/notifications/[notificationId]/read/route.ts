import { NextRequest, NextResponse } from "next/server";
import { getMobileBearerUser } from "@/app/api/mobile/_utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const item = await markNotificationRead(createAdminClient(), {
      notificationId,
      userId: user.id,
    });

    if (!item) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
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
