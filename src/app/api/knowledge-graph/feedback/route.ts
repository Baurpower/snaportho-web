import { NextResponse } from "next/server";
import { z } from "zod";

import { KG_FEEDBACK_TYPES, submitKgGraphFeedback } from "@/lib/education/kg-feedback";
import { createClient } from "@/utils/supabase/server";

const schema = z.object({
  productSurface: z.enum(["brobot", "prepare", "path_to_ortho", "browser_extension", "admin", "other"]),
  releaseId: z.string().trim().max(120).nullish(),
  responseOrRetrievalId: z.string().trim().max(240).nullish(),
  neighborhoodSlugs: z.array(z.string().trim().max(160)).max(50).optional(),
  entityIds: z.array(z.string().uuid()).max(100).optional(),
  relationshipIds: z.array(z.string().uuid()).max(100).optional(),
  feedbackType: z.enum(KG_FEEDBACK_TYPES),
  severity: z.enum(["low", "moderate", "high", "critical"]).optional(),
  userQuery: z.string().max(2000).nullish(),
  explanation: z.string().max(4000).nullish(),
  userRole: z.string().max(120).nullish(),
  supportingSource: z.string().max(1000).nullish(),
  productContext: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid feedback" }, { status: 400 });
  try {
    const result = await submitKgGraphFeedback(supabase, user.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Feedback submission failed" }, { status: 500 });
  }
}
