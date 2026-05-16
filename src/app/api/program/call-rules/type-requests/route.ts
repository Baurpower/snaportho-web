import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (authError || !user || !session?.access_token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json(
        { error: "No active program membership found" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const originalText = String(body?.originalText ?? "").trim();
    const proposed = body?.proposedRuleType;

    if (!originalText || !proposed) {
      return NextResponse.json(
        { error: "originalText and proposedRuleType are required" },
        { status: 400 }
      );
    }

    if (originalText.length < 8 || originalText.length > 500) {
      return NextResponse.json(
        { error: "Rule request must be between 8 and 500 characters." },
        { status: 400 }
      );
    }

    const authedSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      }
    );

    const insertPayload = {
      program_id: membership.program_id,
      requested_by: user.id,
      original_text: originalText,
      proposed_rule_type: String(proposed.rule_type ?? "").trim(),
      proposed_name: String(proposed.name ?? "").trim(),
      proposed_scope: proposed.scope ?? {},
      proposed_config: proposed.config ?? {},
      explanation: proposed.explanation ?? null,
      status: "needs_review",
    };

    const { error } = await authedSupabase
  .from("program_call_rule_type_requests")
  .insert(insertPayload);

if (error) {
  return NextResponse.json(
    {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    },
    { status: 500 }
  );
}

return NextResponse.json(
  {
    success: true,
    message: "Rule request submitted.",
  },
  { status: 201 }
);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit rule type request",
      },
      { status: 500 }
    );
  }
}