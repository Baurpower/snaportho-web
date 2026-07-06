import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
  try {
    const { notificationId } = await context.params;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Missing notification id." },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark notification as read",
      },
      { status: 500 }
    );
  }
}