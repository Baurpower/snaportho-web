import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ProgramRequestBody = {
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPgyYear?: number | null;
  requestedProgramName?: string | null;
  institutionName?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  affirmedResidentOrAffiliated?: boolean;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as ProgramRequestBody;

    const requesterName = body.requesterName?.trim() ?? "";
    const requesterEmail = body.requesterEmail?.trim() ?? user.email ?? "";
    const requesterPgyYear = body.requesterPgyYear ?? null;
    const requestedProgramName = body.requestedProgramName?.trim() ?? "";
    const institutionName = body.institutionName?.trim() ?? "";
    const city = body.city?.trim() || null;
    const state = body.state?.trim() ?? "";
    const notes = body.notes?.trim() || null;
    const affirmedResidentOrAffiliated =
      body.affirmedResidentOrAffiliated === true;

    if (requesterName.length < 2) {
      return NextResponse.json(
        { error: "Requester name is required." },
        { status: 400 }
      );
    }

    if (requesterEmail.length < 3) {
      return NextResponse.json(
        { error: "Requester email is required." },
        { status: 400 }
      );
    }

    if (requestedProgramName.length < 2) {
      return NextResponse.json(
        { error: "Program name is required." },
        { status: 400 }
      );
    }

    if (institutionName.length < 2) {
      return NextResponse.json(
        { error: "Institution name is required." },
        { status: 400 }
      );
    }

    if (state.length < 2) {
      return NextResponse.json(
        { error: "State is required." },
        { status: 400 }
      );
    }

    if (!affirmedResidentOrAffiliated) {
      return NextResponse.json(
        {
          error:
            "You must confirm that you are a resident or directly affiliated with this program.",
        },
        { status: 400 }
      );
    }

    const { data: existingDuplicate, error: duplicateError } = await supabase
      .from("workspace_program_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("requested_program_name", requestedProgramName)
      .eq("institution_name", institutionName)
      .eq("state", state)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        { error: duplicateError.message },
        { status: 500 }
      );
    }

    if (existingDuplicate) {
      return NextResponse.json(
        { error: "You already submitted this program request." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("workspace_program_requests")
      .insert({
        user_id: user.id,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_pgy_year: requesterPgyYear,
        requested_program_name: requestedProgramName,
        institution_name: institutionName,
        city,
        state,
        notes,
        affirmed_resident_or_affiliated: true,
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Program request submitted successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}