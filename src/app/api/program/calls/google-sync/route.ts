import { NextRequest, NextResponse } from "next/server";
import { google, calendar_v3 } from "googleapis";

import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { getGoogleOAuthClient } from "@/lib/google/calendar";

type SyncScope = "mine" | "program";
type SyncMode = "once" | "automatic";

type CallRow = {
  id: string;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  site: string | null;
  is_home_call: boolean | null;
  notes: string | null;
  program_membership_id: string | null;
  program_memberships:
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
};

type ExistingSyncRow = {
  id?: string;
  call_assignment_id?: string;
  provider_event_id: string | null;
  provider_calendar_id: string | null;
};

function normalizeMembership(membership: CallRow["program_memberships"]) {
  if (!membership) return null;
  if (Array.isArray(membership)) return membership[0] ?? null;
  return membership;
}

function addOneDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function deleteGoogleEventSafely({
  calendar,
  calendarId,
  eventId,
}: {
  calendar: ReturnType<typeof google.calendar>;
  calendarId: string;
  eventId: string;
}) {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const scope = (body.scope ?? "mine") as SyncScope;
    const syncMode = (body.syncMode ?? "once") as SyncMode;

    const monthStart = body.monthStart;
    const monthEnd = body.monthEnd;

    const targetCalendarId =
      typeof body.calendarId === "string" && body.calendarId.trim()
        ? body.calendarId.trim()
        : "primary";

    if (!monthStart || !monthEnd) {
      return NextResponse.json(
        { error: "monthStart and monthEnd are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const activeMembership = await getActiveMembershipForUser(user.id);

    if (!activeMembership?.program_id) {
      return NextResponse.json(
        { error: "No active membership" },
        { status: 400 }
      );
    }

    const { data: connection, error: connectionError } = await supabase
      .from("user_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
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

    const calendarList = await calendar.calendarList.list();

    const writableCalendar = calendarList.data.items?.find(
      (item) =>
        item.id === targetCalendarId &&
        ["owner", "writer"].includes(item.accessRole ?? "")
    );

    if (!writableCalendar) {
      return NextResponse.json(
        { error: "Selected Google Calendar is not writable" },
        { status: 400 }
      );
    }

    const { error: updateConnectionError } = await supabase
      .from("user_calendar_connections")
      .update({
        calendar_id: targetCalendarId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (updateConnectionError) {
      throw new Error(updateConnectionError.message);
    }

    let query = supabase
      .from("call_assignments")
      .select(`
        id,
        call_type,
        call_date,
        start_datetime,
        end_datetime,
        site,
        is_home_call,
        notes,
        program_membership_id,
        program_memberships (
          display_name
        )
      `)
      .eq("program_id", activeMembership.program_id)
      .gte("call_date", monthStart)
      .lte("call_date", monthEnd);

    if (scope === "mine") {
      query = query.eq("program_membership_id", activeMembership.id);
    }

    const { data: calls, error: callsError } = await query;

    if (callsError) {
      throw new Error(callsError.message);
    }

    const currentCalls = (calls ?? []) as CallRow[];
    const currentCallIds = new Set(currentCalls.map((call) => call.id));

    const { data: existingSyncRows, error: existingSyncRowsError } =
      await supabase
        .from("synced_call_events")
        .select(
          "id, call_assignment_id, provider_event_id, provider_calendar_id"
        )
        .eq("user_id", user.id)
        .eq("provider", "google")
        .eq("sync_target", "user");

    if (existingSyncRowsError) {
      throw new Error(existingSyncRowsError.message);
    }

    const staleSyncRows = ((existingSyncRows ?? []) as ExistingSyncRow[]).filter(
      (row) => {
        if (!row.call_assignment_id) return false;
        return !currentCallIds.has(row.call_assignment_id);
      }
    );

    let removedCount = 0;

    for (const staleRow of staleSyncRows) {
      if (staleRow.provider_event_id) {
        const deleted = await deleteGoogleEventSafely({
          calendar,
          calendarId:
            staleRow.provider_calendar_id ||
            connection.calendar_id ||
            targetCalendarId ||
            "primary",
          eventId: staleRow.provider_event_id,
        });

        if (deleted) removedCount += 1;
      }
    }

    const staleRowIds = staleSyncRows
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id));

    if (staleRowIds.length > 0) {
      const { error: staleDeleteError } = await supabase
        .from("synced_call_events")
        .delete()
        .in("id", staleRowIds);

      if (staleDeleteError) {
        throw new Error(staleDeleteError.message);
      }
    }

    const syncedEvents: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const call of currentCalls) {
      const membership = normalizeMembership(call.program_memberships);
      const residentName = membership?.display_name ?? "Unknown Resident";

      const summary =
        scope === "mine"
          ? `${call.call_type ?? "Call"} Call`
          : `${residentName} — ${call.call_type ?? "Call"} Call`;

      const description = [
        "Created by SnapOrtho Workspace.",
        call.site ? `Site: ${call.site}` : null,
        call.is_home_call ? "Home Call" : null,
        call.notes ? `Notes: ${call.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { data: existingSync } = await supabase
        .from("synced_call_events")
        .select("provider_event_id, provider_calendar_id")
        .eq("call_assignment_id", call.id)
        .eq("provider", "google")
        .eq("user_id", user.id)
        .eq("sync_target", "user")
        .maybeSingle<ExistingSyncRow>();

      const eventPayload: calendar_v3.Schema$Event = {
        summary,
        description,
        location: call.site ?? undefined,
        extendedProperties: {
          private: {
            snaportho_call_assignment_id: call.id,
            snaportho_sync_scope: scope,
          },
        },
      };

      if (call.start_datetime && call.end_datetime) {
        eventPayload.start = { dateTime: call.start_datetime };
        eventPayload.end = { dateTime: call.end_datetime };
      } else if (call.call_date) {
        eventPayload.start = { date: call.call_date };
        eventPayload.end = { date: addOneDay(call.call_date) };
      } else {
        continue;
      }

      let googleEventId: string | null = null;

      const existingEventId = existingSync?.provider_event_id ?? null;
      const existingCalendarId = existingSync?.provider_calendar_id ?? null;

      if (existingEventId && existingCalendarId === targetCalendarId) {
        try {
          const updated = await calendar.events.update({
            calendarId: targetCalendarId,
            eventId: existingEventId,
            requestBody: eventPayload,
          });

          googleEventId = updated.data.id ?? null;
          updatedCount += 1;
        } catch {
          const created = await calendar.events.insert({
            calendarId: targetCalendarId,
            requestBody: eventPayload,
          });

          googleEventId = created.data.id ?? null;
          createdCount += 1;
        }
      } else {
        if (existingEventId && existingCalendarId) {
          await deleteGoogleEventSafely({
            calendar,
            calendarId: existingCalendarId,
            eventId: existingEventId,
          });
        }

        const created = await calendar.events.insert({
          calendarId: targetCalendarId,
          requestBody: eventPayload,
        });

        googleEventId = created.data.id ?? null;
        createdCount += 1;
      }

      if (!googleEventId) continue;

      syncedEvents.push(googleEventId);

      const { error: upsertSyncError } = await supabase
        .from("synced_call_events")
        .upsert(
          {
            call_assignment_id: call.id,
            user_id: user.id,
            provider: "google",
            provider_event_id: googleEventId,
            provider_calendar_id: targetCalendarId,
            sync_target: "user",
            synced_at: new Date().toISOString(),
            program_id: activeMembership.program_id,
            sync_enabled: syncMode === "automatic",
          },
          {
            onConflict: "call_assignment_id,provider,sync_target,user_id",
          }
        );

      if (upsertSyncError) {
        throw new Error(upsertSyncError.message);
      }
    }

    const { error: syncSettingsError } = await supabase
      .from("user_calendar_sync_settings")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          enabled: syncMode === "automatic",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (syncSettingsError) {
      throw new Error(syncSettingsError.message);
    }

    return NextResponse.json(
      {
        success: true,
        syncedCount: syncedEvents.length,
        createdCount,
        updatedCount,
        removedCount,
        calendarId: targetCalendarId,
        calendarName: writableCalendar.summary ?? "Google Calendar",
        syncEnabled: syncMode === "automatic",
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
            : "Failed syncing Google Calendar",
      },
      { status: 500 }
    );
  }
}