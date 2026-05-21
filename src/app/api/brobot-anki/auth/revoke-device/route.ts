import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateBroBotAnkiRequest,
  hashDeviceToken,
  isoNow,
} from "../../_lib";
import { createAdminClient } from "@/lib/supabase/admin";

const revokeDeviceSchema = z.object({
  deviceToken: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    let parsedBody: unknown = {};
    const rawBody = await request.text();

    if (rawBody.trim().length > 0) {
      try {
        parsedBody = JSON.parse(rawBody) as unknown;
      } catch {
        return NextResponse.json(
          { error: "Request body must be valid JSON." },
          { status: 400 }
        );
      }
    }

    const parsed = revokeDeviceSchema.safeParse(parsedBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "body";

      return NextResponse.json(
        { error: `${path}: ${firstIssue.message}` },
        { status: 400 }
      );
    }

    const now = isoNow();
    const supabase = createAdminClient();

    if (auth.authMethod === "device_token") {
      if (!auth.deviceTokenId) {
        return NextResponse.json(
          { error: "Current device token could not be identified." },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("brobot_anki_device_tokens")
        .update({ revoked_at: now, updated_at: now })
        .eq("id", auth.deviceTokenId)
        .eq("user_id", auth.userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ revoked: true }, { status: 200 });
    }

    const rawDeviceToken = parsed.data.deviceToken?.trim();
    if (!rawDeviceToken) {
      return NextResponse.json(
        { error: "deviceToken is required when revoking from the website." },
        { status: 400 }
      );
    }

    const tokenHash = hashDeviceToken(rawDeviceToken);
    const { error } = await supabase
      .from("brobot_anki_device_tokens")
      .update({ revoked_at: now, updated_at: now })
      .eq("token_hash", tokenHash)
      .eq("user_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ revoked: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
