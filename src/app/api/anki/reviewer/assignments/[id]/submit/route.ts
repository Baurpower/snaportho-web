/* eslint-disable @typescript-eslint/no-explicit-any -- Reviewer rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth, audit } from "../../../_lib";
import { assignmentComplete } from "@/lib/education/anki-reviewer";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    a = await reviewerAuth(request);
  if ("response" in a) return a.response;
  const { data: assignment } = await a.auth.supabase
    .from("anki_review_assignments")
    .select("id,status")
    .eq("id", id)
    .eq("assigned_reviewer_id", a.ctx.userId)
    .maybeSingle();
  if (!assignment || !["assigned", "in_progress"].includes(assignment.status))
    return NextResponse.json(
      { error: "assignment cannot be submitted" },
      { status: 409 },
    );
  const { data: items, error } = await a.auth.supabase
    .from("anki_review_assignment_items")
    .select("item_status")
    .eq("assignment_id", id);
  if (
    error ||
    !assignmentComplete((items ?? []).map((item: any) => item.item_status))
  )
    return NextResponse.json(
      { error: "assignment has incomplete items" },
      { status: 409 },
    );
  const { error: updateError } = await a.auth.supabase
    .from("anki_review_assignments")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("assigned_reviewer_id", a.ctx.userId);
  if (updateError)
    return NextResponse.json(
      { error: "assignment submission failed" },
      { status: 409 },
    );
  await audit(a.auth.supabase, a.ctx, "assignment_submitted", {
    assignment_id: id,
  });
  return NextResponse.json({
    assignmentId: id,
    status: "submitted",
    published: false,
  });
}
