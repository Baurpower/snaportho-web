import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const { data: connection } = await supabase
      .from("user_calendar_connections")
      .select("provider_account_email, calendar_id, updated_at")
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

    const { data: syncSetting } = await supabase
      .from("user_calendar_sync_settings")
      .select("enabled, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const { data: syncedEvents } = await supabase
      .from("synced_call_events")
      .select("id, synced_at, provider_calendar_id")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("sync_target", "user")
      .order("synced_at", { ascending: false });

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