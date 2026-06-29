import { NextResponse } from "next/server";

export async function parseStudentWorkspaceJsonBody<T>(request: Request) {
  try {
    return { data: (await request.json()) as T };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}
