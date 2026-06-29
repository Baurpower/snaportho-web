import { NextRequest, NextResponse } from "next/server";
import {
  createStudentWorkspaceRotation,
  getStudentWorkspaceRotations,
} from "@/lib/student-workspace/rotations";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";

type CreateRotationBody = {
  title?: string;
  institution?: string | null;
  service?: string | null;
  location?: string | null;
  start_date?: string;
  end_date?: string;
  notes?: string | null;
  is_away_rotation?: boolean;
};

export async function GET() {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) {
      return auth.error;
    }

    const rotations = await getStudentWorkspaceRotations(auth.user.id);
    return NextResponse.json({ rotations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load rotations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) {
      return auth.error;
    }

    const bodyResult = await parseStudentWorkspaceJsonBody<CreateRotationBody>(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const rotation = await createStudentWorkspaceRotation(auth.user.id, body);
    return NextResponse.json({ rotation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create rotation" },
      { status: 500 }
    );
  }
}
