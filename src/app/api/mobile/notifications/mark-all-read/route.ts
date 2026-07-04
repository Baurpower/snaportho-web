import { NextRequest, NextResponse } from "next/server";
import { getMobileBearerUser } from "@/app/api/mobile/_utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { markAllNotificationsRead } from "@/lib/workspace/notifications/queries";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

  try {
    const result = await markAllNotificationsRead(createAdminClient(), user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
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
