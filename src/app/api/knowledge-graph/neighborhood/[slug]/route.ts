import { NextResponse } from "next/server";

import { getProductionKgNeighborhood } from "@/lib/education/kg-production";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { slug } = await context.params;
  try {
    const neighborhood = await getProductionKgNeighborhood(supabase, slug);
    if (!neighborhood) return NextResponse.json({ error: "Production neighborhood not found" }, { status: 404 });
    return NextResponse.json(neighborhood, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Production KG lookup failed" }, { status: 500 });
  }
}
