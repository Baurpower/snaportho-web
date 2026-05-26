import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import {
  buildBasicNotificationEmailHtml,
  sendWorkspaceNotificationEmail,
} from "@/lib/workspace/notifications/email";

const testEmailSchema = z.object({
  to: z.string().email("A valid email address is required."),
});

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This route is not available in production." },
      { status: 403 }
    );
  }

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
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = testEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    const now = new Date().toLocaleString("en-US");

    await sendWorkspaceNotificationEmail({
      to: parsed.data.to,
      subject: "SnapOrtho Workspace SMTP Test",
      text: `This is a dev SMTP test from SnapOrtho Workspace.\n\nSent at: ${now}\nTriggered by user: ${user.email ?? user.id}`,
      html: buildBasicNotificationEmailHtml({
        title: "SnapOrtho Workspace SMTP Test",
        message: `This is a dev SMTP test from SnapOrtho Workspace.\n\nSent at: ${now}\nTriggered by user: ${user.email ?? user.id}`,
        actionUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/work/call`
          : null,
      }),
      replyTo: user.email ?? undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        message: `Test email sent to ${parsed.data.to}.`,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send test email.",
      },
      { status: 500 }
    );
  }
}
