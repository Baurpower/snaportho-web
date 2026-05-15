import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

import { createClient } from "@/utils/supabase/server";
import { getGoogleOAuthClient } from "@/lib/google/calendar";

type StopSyncBody = {
  removeEvents?: boolean;
};

type SyncedEventRow = {
  id: string;
  provider_event_id: string | null;
  provider_calendar_id: string | null;
};

type GoogleApiError = {
  code?: number;
  response?: {
    status?: number;
  };
  message?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as StopSyncBody;
    const removeEvents = Boolean(body.removeEvents);

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: connection, error: connectionError } = await supabase
      .from("user_calendar_connections")
      .select("access_token, refresh_token, calendar_id")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    await supabase.from("user_calendar_sync_settings").upsert(
      {
        user_id: user.id,
        provider: "google",
        enabled: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    let removedCount = 0;
    let attemptedCount = 0;

    if (removeEvents) {
      const { data: syncedEvents, error: syncedEventsError } = await supabase
        .from("synced_call_events")
        .select("id, provider_event_id, provider_calendar_id")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .eq("sync_target", "user");

      if (syncedEventsError) {
        throw new Error(syncedEventsError.message);
      }

      const rows = (syncedEvents ?? []) as SyncedEventRow[];
      attemptedCount = rows.filter((row) => row.provider_event_id).length;

      const oauth2Client = getGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
      });

      const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });

      for (const syncedEvent of rows) {
        if (!syncedEvent.provider_event_id) continue;

        const calendarId =
          syncedEvent.provider_calendar_id ||
          connection.calendar_id ||
          "primary";

        try {
          await calendar.events.delete({
            calendarId,
            eventId: syncedEvent.provider_event_id,
          });

          removedCount += 1;
        } catch (err: unknown) {
          const googleError = err as GoogleApiError;
          const status = googleError.code ?? googleError.response?.status;

          if (status === 404 || status === 410) {
            removedCount += 1;
            continue;
          }

          console.error("Failed deleting Google event", {
            eventId: syncedEvent.provider_event_id,
            calendarId,
            status,
            message: googleError.message,
          });
        }
      }

      const idsToDelete = rows.map((event) => event.id);

      if (idsToDelete.length > 0) {
        const { error: deleteRowsError } = await supabase
          .from("synced_call_events")
          .delete()
          .in("id", idsToDelete);

        if (deleteRowsError) {
          throw new Error(deleteRowsError.message);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        syncEnabled: false,
        removedEvents: removeEvents,
        attemptedCount,
        removedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop Google Sync",
      },
      { status: 500 }
    );
  }
}