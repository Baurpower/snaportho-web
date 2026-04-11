import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeString(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const category = body?.category;
    const eventDate = body?.eventDate;
    const isAllDay = Boolean(body?.isAllDay);
    const startTime = body?.startTime;
    const endTime = body?.endTime;
    const location =
      typeof body?.location === "string" && body.location.trim().length > 0
        ? body.location.trim()
        : null;
    const attending =
      typeof body?.attending === "string" && body.attending.trim().length > 0
        ? body.attending.trim()
        : null;
    const description =
      typeof body?.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!["or", "clinic", "custom"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!isValidDateString(eventDate)) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
    }

    if (!isAllDay) {
      if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
        return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
      }
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .update({
        title,
        category,
        event_date: eventDate,
        is_all_day: isAllDay,
        start_time: isAllDay ? null : startTime,
        end_time: isAllDay ? null : endTime,
        location,
        attending,
        description,
      })
      .eq("id", eventId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update event" },
        { status: 400 }
      );
    }

    return NextResponse.json({ event: data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete event" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}