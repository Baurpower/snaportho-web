import { NextResponse } from "next/server";

import { authenticateBroBotAnkiRequest } from "../_lib";

export async function GET(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const { supabase, userId } = auth;

    const { data, error } = await supabase
      .from("brobot_anki_prep_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
