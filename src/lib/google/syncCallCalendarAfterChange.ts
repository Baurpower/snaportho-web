import { google, calendar_v3 } from "googleapis";
import { createClient } from "@/utils/supabase/server";
import { getGoogleOAuthClient } from "@/lib/google/calendar";

export async function syncGoogleCalendarAfterCallChange(userId: string) {
  const supabase = await createClient();

  const { data: syncSettings } = await supabase
    .from("user_calendar_sync_settings")
    .select("enabled")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!syncSettings?.enabled) {
    return {
      skipped: true,
      reason: "Google Sync is not enabled",
    };
  }

  const { data: connection } = await supabase
    .from("user_calendar_connections")
    .select("access_token, refresh_token, calendar_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!connection?.calendar_id) {
    return {
      skipped: true,
      reason: "Google Calendar is not connected",
    };
  }

  const { data: syncedRows, error: syncedRowsError } = await supabase
    .from("synced_call_events")
    .select(
      `
        id,
        call_assignment_id,
        provider_event_id,
        provider_calendar_id,
        call_assignments (
          id,
          call_type,
          call_date,
          start_datetime,
          end_datetime,
          site,
          is_home_call,
          notes,
          program_memberships (
            display_name
          )
        )
      `
    )
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("sync_target", "user")
    .eq("sync_enabled", true);

  if (syncedRowsError) {
    throw new Error(syncedRowsError.message);
  }

  const oauth2Client = getGoogleOAuthClient();

  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  let updatedCount = 0;
  let removedCount = 0;

  for (const row of syncedRows ?? []) {
    const call = Array.isArray(row.call_assignments)
      ? row.call_assignments[0]
      : row.call_assignments;

    const calendarId =
      row.provider_calendar_id || connection.calendar_id || "primary";

    if (!row.provider_event_id) continue;

    if (!call) {
      try {
        await calendar.events.delete({
          calendarId,
          eventId: row.provider_event_id,
        });

        removedCount += 1;
      } catch {
        // Already deleted from Google.
      }

      await supabase
        .from("synced_call_events")
        .delete()
        .eq("id", row.id);

      continue;
    }

    const membership = Array.isArray(call.program_memberships)
      ? call.program_memberships[0]
      : call.program_memberships;

    const residentName = membership?.display_name ?? "Unknown Resident";

    const eventPayload: calendar_v3.Schema$Event = {
      summary: `${residentName} — ${call.call_type ?? "Call"} Call`,
      description: [
        "Created by SnapOrtho Workspace.",
        call.site ? `Site: ${call.site}` : null,
        call.is_home_call ? "Home Call" : null,
        call.notes ? `Notes: ${call.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      location: call.site ?? undefined,
      extendedProperties: {
        private: {
          snaportho_call_assignment_id: call.id,
        },
      },
    };

    if (call.start_datetime && call.end_datetime) {
      eventPayload.start = { dateTime: call.start_datetime };
      eventPayload.end = { dateTime: call.end_datetime };
    } else if (call.call_date) {
      const endDate = new Date(`${call.call_date}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);

      eventPayload.start = { date: call.call_date };
      eventPayload.end = { date: endDate.toISOString().slice(0, 10) };
    } else {
      continue;
    }

    try {
      await calendar.events.update({
        calendarId,
        eventId: row.provider_event_id,
        requestBody: eventPayload,
      });

      updatedCount += 1;

      await supabase
        .from("synced_call_events")
        .update({
          synced_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } catch {
      // If Google event was manually deleted, remove local sync row.
      await supabase
        .from("synced_call_events")
        .delete()
        .eq("id", row.id);
    }
  }

  return {
    skipped: false,
    updatedCount,
    removedCount,
  };
}