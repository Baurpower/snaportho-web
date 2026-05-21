import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateBroBotAnkiRequest,
  getDeviceLinkByCode,
  isExpired,
  isoNow,
  parseJsonBody,
} from "../../_lib";

const approveLinkSchema = z.object({
  linkCode: z.string().trim().min(1, "linkCode is required.").max(32),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    if (auth.authMethod === "device_token") {
      return NextResponse.json(
        { error: "Device tokens cannot approve new device links." },
        { status: 403 }
      );
    }

    const parsed = await parseJsonBody(request, approveLinkSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const lookup = await getDeviceLinkByCode(parsed.data.linkCode.trim().toUpperCase());

    if (!lookup.success) {
      return lookup.response;
    }

    const { supabase, link } = lookup;

    if (!link) {
      return NextResponse.json({ error: "Link code not found." }, { status: 404 });
    }

    if (link.revoked_at || link.status === "revoked") {
      return NextResponse.json(
        { error: "This link request has already been revoked." },
        { status: 410 }
      );
    }

    if (isExpired(link.expires_at)) {
      await supabase
        .from("brobot_anki_device_links")
        .update({ status: "expired", updated_at: isoNow() })
        .eq("id", link.id);

      return NextResponse.json(
        { error: "This link code has expired. Start the link flow again in Anki." },
        { status: 410 }
      );
    }

    if (link.user_id && link.user_id !== auth.userId) {
      return NextResponse.json(
        { error: "This device link was already approved by another account." },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("brobot_anki_device_links")
      .update({
        user_id: auth.userId,
        status: "approved",
        approved_at: isoNow(),
        updated_at: isoNow(),
      })
      .eq("id", link.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        approved: true,
        status: "approved",
        deviceName: link.device_name,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
