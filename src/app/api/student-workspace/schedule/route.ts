import { NextRequest, NextResponse } from "next/server";
import {
  createStudentWorkspaceScheduleEntry,
  getStudentWorkspaceScheduleEntriesForWeek,
} from "@/lib/student-workspace/schedule";
import { getStudentWorkspaceProfileByUserId } from "@/lib/student-workspace/profile";
import {
  getDateKeyForTimeZone,
  getStartOfWeekDateKey,
  isValidDateOnlyString,
  resolveStudentWorkspaceTimeZone,
} from "@/lib/student-workspace/date";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceScheduleEntryInsert } from "@/lib/student-workspace/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const weekStartParam = request.nextUrl.searchParams.get("week_start");
    const profile = await getStudentWorkspaceProfileByUserId(auth.user.id);
    const weekStart = weekStartParam
      ? isValidDateOnlyString(weekStartParam)
        ? weekStartParam
        : null
      : getStartOfWeekDateKey(
          getDateKeyForTimeZone(resolveStudentWorkspaceTimeZone(profile?.timezone))
        );

    if (!weekStart) {
      return NextResponse.json(
        { error: "week_start must use valid YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const entries = await getStudentWorkspaceScheduleEntriesForWeek(
      auth.user.id,
      weekStart
    );
    return NextResponse.json({ week_start: weekStart, entries });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load schedule entries",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<
      Partial<Omit<StudentWorkspaceScheduleEntryInsert, "user_id">>
    >(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const entry = await createStudentWorkspaceScheduleEntry(auth.user.id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create schedule entry" },
      { status: 500 }
    );
  }
}
