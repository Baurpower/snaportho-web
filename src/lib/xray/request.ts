import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";

export async function requireXrayApiUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }
  return { user } as const;
}

export function xrayApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid X-ray workflow request", issues: error.issues }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "X-ray workflow request failed";
  const status = /access required|forbidden|active assignment|required/i.test(message) ? 403
    : /conflict|idempotency|hashes do not match/i.test(message) ? 409
    : 400;
  return NextResponse.json({ error: message }, { status });
}
