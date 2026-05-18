import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const ruleSetId = String(body?.ruleSetId ?? "").trim();
    const rule = body?.rule;

    if (!ruleSetId || !rule) {
      return NextResponse.json(
        { error: "ruleSetId and rule are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("program_call_rules")
      .insert({
        program_id: membership.program_id,
        rule_set_id: ruleSetId,
        rule_type: rule.rule_type,
        name: rule.name,
        is_enabled: true,
        is_hard_rule: Boolean(rule.is_hard_rule),
        priority:
          typeof rule.priority === "number" ? rule.priority : 50,
        scope: rule.scope ?? {},
        config: {
          ...(rule.config ?? {}),
          ai_generated: true,
          ai_explanation: rule.explanation ?? null,
          original_text: body.originalText ?? null,
        },
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (error) {
    console.error("Failed to save AI-created rule", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save AI-created rule",
      },
      { status: 500 }
    );
  }
}