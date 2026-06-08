import { NextResponse } from "next/server";
import { requireGoogleApiUser } from "@/lib/google/auth";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

export async function GET() {
  try {
    const { user, admin } = await requireGoogleApiUser("google.status");

    if (!user) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const membership = await getActiveMembershipForUser(user.id);
    const programId = membership?.program_id ?? null;

    const { data: connection } = await admin
      .from("user_calendar_connections")
      .select("id, user_id, provider_account_email, calendar_id, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({
        connected: false,
        email: null,
        calendarId: null,
        updatedAt: null,
        syncEnabled: false,
        lastSyncedAt: null,
        lastSyncedCount: 0,
        calendarName: null,
      });
    }

    logGoogleAudit(
      "status.connection",
      googleConnectionAuditDetails(connection)
    );

    const { data: syncSetting } = programId
      ? await admin
      .from("user_calendar_sync_settings")
      .select("id, user_id, program_id, connection_id, enabled, updated_at")
      .eq("user_id", user.id)
      .eq("program_id", programId)
      .eq("connection_id", connection.id)
      .eq("provider", "google")
      .maybeSingle()
      : { data: null };

    logGoogleAudit("status.settings", {
      settingsId: syncSetting?.id ?? null,
      selectedCalendarId: connection.calendar_id ?? null,
      userId: user.id,
      programId,
    });

    const { data: syncedEvents } = programId
      ? await admin
      .from("synced_call_events")
      .select("id, synced_at, provider_calendar_id")
      .eq("user_id", user.id)
      .eq("program_id", programId)
      .eq("connection_id", connection.id)
      .eq("provider", "google")
      .eq("sync_target", "user")
      .order("synced_at", { ascending: false })
      : { data: [] };

    const lastSyncedAt = syncedEvents?.[0]?.synced_at ?? null;
    const lastSyncedCount = syncedEvents?.length ?? 0;

    return NextResponse.json({
      connected: true,
      email: connection.provider_account_email ?? null,
      calendarId: connection.calendar_id ?? null,
      updatedAt: connection.updated_at ?? null,
      syncEnabled: Boolean(syncSetting?.enabled),
      lastSyncedAt,
      lastSyncedCount,
      calendarName:
        connection.calendar_id === "primary"
          ? "Primary Google Calendar"
          : "Selected Google Calendar",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
