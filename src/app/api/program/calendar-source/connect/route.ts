import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";
import { createProgramCalendarOAuthClient } from "@/lib/google/program-calendar-sync";
import { PROGRAM_CALENDAR_OAUTH_SCOPES } from "@/lib/google/program-calendar-sync";
import { assertProgramCalendarTokenEncryptionConfigured } from "@/lib/google/program-calendar-crypto";

const COOKIE = "snaportho_program_calendar_oauth_state";

export async function POST() {
  try {
    const context = await requireProgramCalendarAdmin();
    if (!context)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Fail before leaving SnapOrtho if production cannot safely persist tokens.
    assertProgramCalendarTokenEncryptionConfigured();

    const nonce = crypto.randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = {
      nonce,
      userId: context.user.id,
      programId: context.access.accessContext.programId,
      expiresAt,
    };
    const state = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const admin = createAdminClient();
    const { error } = await admin.from("program_calendar_oauth_states").insert({
      nonce_hash: crypto.createHash("sha256").update(nonce).digest("hex"),
      user_id: context.user.id,
      program_id: payload.programId,
      expires_at: new Date(expiresAt).toISOString(),
    });
    if (error) throw error;
    const url = createProgramCalendarOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      state,
      scope: PROGRAM_CALENDAR_OAUTH_SCOPES,
    });
    const response = NextResponse.json({ url });
    response.cookies.set(COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error("[program-calendar/connect]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          error.message.includes("PROGRAM_CALENDAR_TOKEN_ENCRYPTION_KEY")
            ? "Program calendar encryption is not configured in production."
            : "Could not start the Google Calendar connection.",
      },
      { status: 500 },
    );
  }
}
