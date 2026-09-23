import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateBroBotAnkiRequest } from "../../_lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_OVERLAP_LEARNER_CONTRACT } from "@/lib/education/contracts/claim-overlap-learner-v1";

const bodySchema = z.object({
  launchCommandId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_launch" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("educational_anki_launch_commands")
    .update({ status: "claimed" })
    .eq("id", parsed.data.launchCommandId)
    .eq("user_id", auth.userId)
    .eq("contract_version", CLAIM_OVERLAP_LEARNER_CONTRACT)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_claimable" }, { status: 409 });
  return NextResponse.json({ ok: true, launchCommandId: data.id });
}
