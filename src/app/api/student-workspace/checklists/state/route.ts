import { NextRequest, NextResponse } from "next/server";
import {
  getStudentWorkspaceChecklistStateForDate,
  upsertStudentWorkspaceChecklistState,
} from "@/lib/student-workspace/checklists";
import { isValidDateOnlyString } from "@/lib/student-workspace/date";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";
import type { StudentWorkspaceChecklistStateUpsert } from "@/lib/student-workspace/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const date = request.nextUrl.searchParams.get("date");
    if (!date || !isValidDateOnlyString(date)) {
      return NextResponse.json(
        { error: "date must use valid YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const state = await getStudentWorkspaceChecklistStateForDate(
      auth.user.id,
      date
    );
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load checklist state",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) return auth.error;

    const bodyResult = await parseStudentWorkspaceJsonBody<StudentWorkspaceChecklistStateUpsert>(
      request
    );
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    if (typeof body.is_completed !== "boolean") {
      return NextResponse.json(
        { error: "is_completed must be a boolean." },
        { status: 400 }
      );
    }

    const state = await upsertStudentWorkspaceChecklistState(auth.user.id, body);
    return NextResponse.json({ state });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update checklist state" },
      { status: 500 }
    );
  }
}
