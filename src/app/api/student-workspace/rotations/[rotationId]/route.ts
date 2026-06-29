import { NextRequest, NextResponse } from "next/server";
import {
  deleteStudentWorkspaceRotation,
  updateStudentWorkspaceRotation,
} from "@/lib/student-workspace/rotations";
import { parseStudentWorkspaceJsonBody } from "@/lib/student-workspace/api";
import { requireStudentWorkspaceEligibleApiUser } from "@/lib/student-workspace/request-user";

type RouteContext = {
  params: Promise<{
    rotationId: string;
  }>;
};

type UpdateRotationBody = {
  title?: string;
  institution?: string | null;
  service?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  is_away_rotation?: boolean;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) {
      return auth.error;
    }

    const { rotationId } = await context.params;
    const bodyResult = await parseStudentWorkspaceJsonBody<UpdateRotationBody>(request);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data;
    const rotation = await updateStudentWorkspaceRotation(
      auth.user.id,
      rotationId,
      body
    );

    return NextResponse.json({ rotation });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Rotation not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to update rotation" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStudentWorkspaceEligibleApiUser();
    if ("error" in auth) {
      return auth.error;
    }

    const { rotationId } = await context.params;
    const rotations = await deleteStudentWorkspaceRotation(auth.user.id, rotationId);
    return NextResponse.json({ rotations });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Rotation not found." ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Failed to delete rotation" },
      { status: 500 }
    );
  }
}
