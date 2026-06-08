import { NextResponse } from "next/server";
import { google } from "googleapis";

import { getAuthorizedGoogleOAuthClient } from "@/lib/google/calendar";
import { requireGoogleApiUser } from "@/lib/google/auth";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, admin } = await requireGoogleApiUser("google.calendars.list");

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: connection, error: connectionError } = await admin
      .from("user_calendar_connections")
      .select("id, user_id, provider_account_email, access_token, refresh_token, calendar_id")
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
      "calendars.connection",
      googleConnectionAuditDetails(connection)
    );

    const oauth2Client = getAuthorizedGoogleOAuthClient(connection);

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await calendar.calendarList.list({
      minAccessRole: "writer",
      fields: "items(id,summary,primary,accessRole)",
    });

    const calendars =
      response.data.items
        ?.filter((calendarItem) => Boolean(calendarItem.id))
        .map((calendarItem) => ({
          id: calendarItem.id ?? "",
          summary: calendarItem.summary ?? "Untitled Calendar",
          primary: Boolean(calendarItem.primary),
          accessRole: calendarItem.accessRole ?? null,
        })) ?? [];

    calendars.sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return a.summary.localeCompare(b.summary);
    });

    const selectedCalendarExists = calendars.some(
      (calendarItem) => calendarItem.id === connection.calendar_id
    );

    const primaryCalendar = calendars.find(
      (calendarItem) => calendarItem.primary
    );

    const selectedCalendarId = selectedCalendarExists
      ? connection.calendar_id
      : primaryCalendar?.id ?? calendars[0]?.id ?? "primary";

    return NextResponse.json(
      {
        calendars,
        selectedCalendarId,
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
            : "Failed to load Google calendars",
      },
      { status: 500 }
    );
  }
}
