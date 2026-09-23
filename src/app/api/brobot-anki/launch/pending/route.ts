import { NextResponse } from "next/server";

import { authenticateBroBotAnkiRequest } from "../../_lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_OVERLAP_LEARNER_CONTRACT } from "@/lib/education/contracts/claim-overlap-learner-v1";
import { toLaunchRequest } from "@/lib/education/anki-launch-commands";

export async function GET(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("educational_anki_launch_commands")
    .select("id,canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,requested_at,expires_at")
    .eq("user_id", auth.userId)
    .eq("contract_version", CLAIM_OVERLAP_LEARNER_CONTRACT)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("requested_at", { ascending: true })
    .limit(3);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    commands: (data ?? []).map((row) => toLaunchRequest(row)),
  });
}
