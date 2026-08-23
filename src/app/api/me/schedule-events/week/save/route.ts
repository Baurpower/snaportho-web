import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { mapScheduleEventRow } from "@/lib/workspace/call/schedule-events";
import { validateScheduleEventTimes } from "@/lib/workspace/call/schedule-event-time";

type WeekChange = {
  action?: "upsert" | "delete";
  date?: string;
  eventId?: string | null;
  expectedUpdatedAt?: string | null;
  title?: string;
  category?: "or" | "clinic" | "custom";
  isAllDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  attending?: string | null;
  description?: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const weekStart = body?.weekStart;
    const weekEnd = body?.weekEnd;
    const changes = body?.changes as WeekChange[] | undefined;

    if (
      typeof weekStart !== "string" ||
      typeof weekEnd !== "string" ||
      !DATE_PATTERN.test(weekStart) ||
      !DATE_PATTERN.test(weekEnd) ||
      !Array.isArray(changes) ||
      changes.length === 0 ||
      changes.length > 7
    ) {
      return NextResponse.json({ error: "Invalid weekly plan payload" }, { status: 400 });
    }

    for (const change of changes) {
      if (!change.date || !DATE_PATTERN.test(change.date)) {
        return NextResponse.json({ error: "Every change needs a valid date" }, { status: 400 });
      }
      if (change.action === "delete") continue;
      if (
        change.action !== "upsert" ||
        !change.title?.trim() ||
        !change.category ||
        !["or", "clinic", "custom"].includes(change.category)
      ) {
        return NextResponse.json({ error: "Every planned day needs a title and category" }, { status: 400 });
      }
      const timeValidation = validateScheduleEventTimes({
        isAllDay: change.isAllDay ?? true,
        startTime: change.startTime,
        endTime: change.endTime,
      });
      if (!timeValidation.valid) {
        return NextResponse.json({ error: timeValidation.error }, { status: 400 });
      }
    }

    const { data, error } = await supabase.rpc("save_schedule_event_week", {
      p_week_start: weekStart,
      p_week_end: weekEnd,
      p_changes: changes,
    });

    if (error) {
      const conflict = error.code === "40001";
      return NextResponse.json(
        { error: error.message || "Failed to save weekly plan", conflict },
        { status: conflict ? 409 : 400 }
      );
    }

    const events = Array.isArray(data) ? data.map(mapScheduleEventRow) : [];
    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save weekly plan" },
      { status: 500 }
    );
  }
}
