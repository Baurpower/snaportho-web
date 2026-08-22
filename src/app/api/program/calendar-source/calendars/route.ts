import { NextResponse } from "next/server";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";
import {
  getProgramCalendarConnection,
  listProgramGoogleCalendars,
} from "@/lib/google/program-calendar-sync";

export async function GET() {
  const context = await requireProgramCalendarAdmin();
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const connection = await getProgramCalendarConnection(
    context.access.accessContext.programId,
  );
  if (!connection)
    return NextResponse.json(
      { error: "Program Google Calendar is not connected" },
      { status: 400 },
    );
  return NextResponse.json({
    calendars: await listProgramGoogleCalendars(connection),
  });
}
