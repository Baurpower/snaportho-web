import { NextResponse } from "next/server";

import { WorkspacePermissionError } from "@/lib/workspace/access-control";
import { SignoutValidationError } from "@/lib/workspace/signout/validation";

/** Map a thrown error to the right JSON response for a sign-out route. */
export function signoutErrorResponse(error: unknown): NextResponse {
  if (error instanceof WorkspacePermissionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SignoutValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Sign-out request failed" },
    { status: 500 }
  );
}

/** Parse a JSON request body, returning {} for an empty body. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new SignoutValidationError("Invalid JSON body");
  }
}
