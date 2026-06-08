import { NextResponse } from "next/server";
import { google } from "googleapis";

import { getAuthorizedGoogleOAuthClient } from "@/lib/google/calendar";
import { requireGoogleApiUser } from "@/lib/google/auth";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { user, admin } = await requireGoogleApiUser("google.calendars.create");

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: connection, error: connectionError } = await admin
      .from("user_calendar_connections")
      .select("id, user_id, provider_account_email, access_token, refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    logGoogleAudit(
      "calendar_create.connection",
      googleConnectionAuditDetails(connection)
    );

    const oauth2Client = getAuthorizedGoogleOAuthClient(connection);

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const created = await calendar.calendars.insert({
      requestBody: {
        summary: "SnapOrtho Workspace",
        description: "Dedicated calendar for SnapOrtho Workspace call events.",
        timeZone: "America/New_York",
      },
      fields: "id,summary",
    });

    const calendarId = created.data.id;

    if (!calendarId) {
      throw new Error("Google did not return a calendar ID.");
    }

    const { error: updateError } = await admin
      .from("user_calendar_connections")
      .update({
        calendar_id: calendarId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("id", connection.id)
      .eq("provider", "google");

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json(
      {
        success: true,
        calendar: {
          id: calendarId,
          summary: created.data.summary ?? "SnapOrtho Workspace",
          primary: false,
          accessRole: "owner",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Google Calendar",
      },
      { status: 500 }
    );
  }
}
