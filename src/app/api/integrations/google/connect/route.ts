import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const next = new URL(request.url).searchParams.get("next") ?? "/work/call";

    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        next,
      })
    ).toString("base64url");

    return NextResponse.redirect(getGoogleAuthUrl(state));
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to initialize Google OAuth" },
      { status: 500 }
    );
  }
}