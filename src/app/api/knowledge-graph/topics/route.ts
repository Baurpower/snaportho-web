import { NextResponse } from "next/server";
import { z } from "zod";

import { findProductionKgTopics } from "@/lib/education/kg-production";
import { createClient } from "@/utils/supabase/server";

const schema = z.object({
  query: z.string().trim().min(1).max(240),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const parsed = schema.safeParse({
    query: url.searchParams.get("query"),
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid topic query" }, { status: 400 });
  }

  try {
    const matches = await findProductionKgTopics(supabase, parsed.data.query, parsed.data.limit);
    return NextResponse.json(
      { matches },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Production KG topic lookup failed" },
      { status: 500 }
    );
  }
}
