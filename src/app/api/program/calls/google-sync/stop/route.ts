import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

import { createClient } from "@/utils/supabase/server";
import { getAuthorizedGoogleOAuthClient } from "@/lib/google/calendar";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

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

    logGoogleAudit("endpoint.auth", {
      endpoint: "program.calls.google-sync.stop",
      userId: user.id,
      userEmail: user.email ?? null,
    });

    const membership = await getActiveMembershipForUser(user.id);
    if (!membership?.program_id) {
      return NextResponse.json({ error: "No active membership" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: connection, error: connectionError } = await admin
      .from("user_calendar_connections")
      .select("id, user_id, provider_account_email, access_token, refresh_token, calendar_id")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    logGoogleAudit(
      "stop.connection",
      googleConnectionAuditDetails(connection)
    );

    const { data: syncSetting, error: settingError } = await admin
      .from("user_calendar_sync_settings").upsert(
      {
        user_id: user.id,
        program_id: membership.program_id,
        connection_id: connection.id,
        provider: "google",
        enabled: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id,provider" }
    )
      .select("id, user_id, program_id")
      .single();

    if (settingError) {
      throw new Error(settingError.message);
    }

    logGoogleAudit("stop.settings", {
      settingsId: syncSetting.id,
      selectedCalendarId: connection.calendar_id,
      userId: syncSetting.user_id,
      programId: syncSetting.program_id,
    });

    let removedCount = 0;
    let attemptedCount = 0;

    if (removeEvents) {
      const { data: syncedEvents, error: syncedEventsError } = await admin
        .from("synced_call_events")
        .select("id, provider_event_id, provider_calendar_id")
        .eq("user_id", user.id)
        .eq("program_id", membership.program_id)
        .eq("connection_id", connection.id)
        .eq("provider", "google")
        .eq("sync_target", "user");

      if (syncedEventsError) {
        throw new Error(syncedEventsError.message);
      }

      const rows = (syncedEvents ?? []) as SyncedEventRow[];
      attemptedCount = rows.filter((row) => row.provider_event_id).length;

      const oauth2Client = getAuthorizedGoogleOAuthClient(connection);

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
        const { error: deleteRowsError } = await admin
          .from("synced_call_events")
          .delete()
          .in("id", idsToDelete)
          .eq("user_id", user.id)
          .eq("program_id", membership.program_id)
          .eq("connection_id", connection.id);

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
