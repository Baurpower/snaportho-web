import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { getProgramAvailabilityMonth } from "@/lib/db/programavailability";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        {
          monthStart: "",
          monthEnd: "",
          residents: [],
          availability: {},
        },
        { status: 200 }
      );
    }

    const monthStart = request.nextUrl.searchParams.get("monthStart");
    const monthEnd = request.nextUrl.searchParams.get("monthEnd");

    if (!monthStart || !monthEnd) {
      return NextResponse.json(
        { error: "monthStart and monthEnd are required" },
        { status: 400 }
      );
    }

    const payload = await getProgramAvailabilityMonth({
      programId: membership.program_id,
      monthStart,
      monthEnd,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load program availability",
      },
      { status: 500 }
    );
  }
}