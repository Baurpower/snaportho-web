import { NextRequest, NextResponse } from "next/server";
import { getMobileBearerUser } from "@/app/api/mobile/_utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNotificationsForCurrentUser,
  getUnreadNotificationCount,
} from "@/lib/workspace/notifications/queries";
import type { WorkspaceNotification } from "@/lib/workspace/notifications/types";

function parseLimit(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  if (!Number.isInteger(raw) || raw <= 0) return 50;
  return Math.min(raw, 100);
}

function mapMobileNotification(item: WorkspaceNotification) {
  return {
    id: item.id,
    title: item.title,
    body: item.message,
    message: item.message,
    category: item.category,
    type: item.type,
    deepLink: item.action_url,
    actionURL: item.action_url,
    createdAt: item.created_at,
    isRead: item.read_at != null,
    readAt: item.read_at,
    metadata: item.metadata ?? {},
  };
}

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileBearerUser(request);
  if (response) return response;

  try {
    const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
    const limit = parseLimit(request);
    const admin = createAdminClient();

    const [items, unreadCount] = await Promise.all([
      getNotificationsForCurrentUser(admin, {
        userId: user.id,
        unreadOnly,
        limit,
      }),
      getUnreadNotificationCount(admin, user.id),
    ]);

    const notifications = items.map(mapMobileNotification);

    if (process.env.NODE_ENV !== "production") {
      console.log("[mobile/notifications] success", {
        userId: user.id.slice(0, 8),
        count: notifications.length,
        unreadCount,
      });
    }

    return NextResponse.json(
      {
        notifications,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[mobile/notifications] error", {
      userId: user.id.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
