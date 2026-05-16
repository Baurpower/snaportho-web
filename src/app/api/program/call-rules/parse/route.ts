import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_RULE_TYPES = [
  "pgy_slot_restriction",
  "minimum_spacing",
  "max_monthly_calls",
  "max_weekend_calls",
  "avoid_consecutive_call",
  "same_day_slot_restriction",
  "prefer_balanced_totals",
  "prefer_balanced_weekends",
  "custom_soft_preference",
] as const;

function safeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

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
    const text = String(body?.text ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Rule text is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You convert residency call scheduling rules into strict JSON.

The app currently supports ONLY these executable rule_type values:
${ALLOWED_RULE_TYPES.join(", ")}

If the user's rule fits one of the supported executable rule types, return it in "rules".

If the user's rule does NOT fit one of the supported executable rule types, do NOT force it into "rules".
Instead, return it in "proposedRuleTypes". This is for new rule types that need developer/admin review before the scheduler can enforce them.

Return JSON only with this exact shape:
{
  "rules": [
    {
      "rule_type": string,
      "name": string,
      "is_hard_rule": boolean,
      "priority": number,
      "scope": object,
      "config": object,
      "explanation": string
    }
  ],
  "proposedRuleTypes": [
    {
      "rule_type": string,
      "name": string,
      "scope": object,
      "config": object,
      "explanation": string
    }
  ],
  "warnings": string[],
  "unparsedStatements": string[]
}

Supported executable rule examples:

1. "PGY-1 residents cannot take primary call"
{
  "rule_type": "pgy_slot_restriction",
  "name": "PGY-1 cannot take primary call",
  "is_hard_rule": true,
  "priority": 100,
  "scope": { "pgyYears": [1], "slot": "Primary" },
  "config": { "blocked": true },
  "explanation": "Blocks PGY-1 residents from being assigned to primary call."
}

2. "No resident should have more than 2 weekends per month"
{
  "rule_type": "max_weekend_calls",
  "name": "Maximum 2 weekends per month",
  "is_hard_rule": true,
  "priority": 100,
  "scope": { "appliesTo": "all_residents" },
  "config": { "maxWeekends": 2 },
  "explanation": "Prevents any resident from being assigned more than 2 weekend call assignments per month."
}

3. "Avoid back-to-back call"
{
  "rule_type": "avoid_consecutive_call",
  "name": "Avoid back-to-back call",
  "is_hard_rule": false,
  "priority": 50,
  "scope": { "appliesTo": "all_residents" },
  "config": { "minDays": 1 },
  "explanation": "Penalizes assigning a resident on consecutive days."
}

Unknown/new rule type examples:

1. "PGY 4 call on Thursday"
This is a weekday-based PGY restriction and is NOT currently supported.
Return it as:
{
  "rule_type": "restrict_call_day_by_pgy",
  "name": "Restrict PGY-4 call to Thursday",
  "scope": { "pgyYears": [4], "daysOfWeek": ["Thursday"] },
  "config": { "mode": "only_allowed_on_days" },
  "explanation": "This would require a new scheduler rule allowing PGY-4 residents to take call only on Thursdays."
}

2. "Chiefs should only take jeopardy call"
This is a new call-role restriction if jeopardy is not an existing call type.
Return it as proposedRuleTypes.

Rules:
- Do not invent details.
- Do not force unsupported rules into existing executable rule types.
- Hard rules block assignment.
- Soft rules only influence scoring/preference.
- Use priority 100 for hard rules, 50 for normal soft rules, 25 for weak preferences.
- "rules" should only include supported executable rule types from the allowed list.
- "proposedRuleTypes" should include reasonable structured proposals for unsupported rule ideas.
- If the text is too vague to understand, put it in unparsedStatements.
          `,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const parsedText = completion.choices[0]?.message?.content;

    if (!parsedText) {
      return NextResponse.json(
        { error: "AI did not return a rule" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(parsedText);

    return NextResponse.json({
      rules: safeArray(parsed.rules),
      proposedRuleTypes: safeArray(parsed.proposedRuleTypes),
      warnings: safeArray(parsed.warnings),
      unparsedStatements: safeArray(parsed.unparsedStatements),
    });
  } catch (error) {
    console.error("Failed to parse call rule", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse call rule",
      },
      { status: 500 }
    );
  }
}