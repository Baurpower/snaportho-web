import { NextResponse } from "next/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import { requireGoogleApiUser } from "@/lib/google/auth";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

export async function DELETE() {
  try {
    const { user, admin } = await requireGoogleApiUser("google.disconnect");
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);
    const { data: connection, error: connectionError } = await admin
      .from("user_calendar_connections")
      .select("id, user_id, provider_account_email")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    if (connectionError) {
      throw new Error(connectionError.message);
    }

    if (!connection) {
      return NextResponse.json({ success: true });
    }

    logGoogleAudit(
      "disconnect.connection",
      googleConnectionAuditDetails(connection)
    );

    const { error: deleteError } = await admin
      .from("user_calendar_connections")
      .delete()
      .eq("id", connection.id)
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    logGoogleAudit("disconnect.complete", {
      connectionId: connection.id,
      userId: user.id,
      programId: membership?.program_id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to disconnect Google Calendar",
      },
      { status: 500 }
    );
  }
}
