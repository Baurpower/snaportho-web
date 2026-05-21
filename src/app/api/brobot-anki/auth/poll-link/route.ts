import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateDeviceToken,
  getDeviceLinkByCode,
  hashDeviceToken,
  isExpired,
  isoNow,
  parseJsonBody,
} from "../../_lib";

const pollLinkSchema = z.object({
  linkCode: z.string().trim().min(1, "linkCode is required.").max(32),
});

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, pollLinkSchema);

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
        { approved: false, status: "revoked" },
        { status: 200 }
      );
    }

    if (isExpired(link.expires_at)) {
      await supabase
        .from("brobot_anki_device_links")
        .update({ status: "expired", updated_at: isoNow() })
        .eq("id", link.id);

      return NextResponse.json(
        { approved: false, status: "expired" },
        { status: 200 }
      );
    }

    if (!link.user_id || !link.approved_at || link.status === "pending") {
      return NextResponse.json(
        { approved: false, status: "pending" },
        { status: 200 }
      );
    }

    if (link.exchanged_at) {
      return NextResponse.json(
        {
          approved: true,
          status: "consumed",
          error:
            "A device token was already issued for this link code. Start a new link flow if needed.",
        },
        { status: 409 }
      );
    }

    const rawDeviceToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(rawDeviceToken);
    const now = isoNow();

    const { error: tokenError } = await supabase
      .from("brobot_anki_device_tokens")
      .insert({
        device_link_id: link.id,
        user_id: link.user_id,
        device_name: link.device_name,
        token_hash: tokenHash,
        created_at: now,
        updated_at: now,
      });

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const { error: linkError } = await supabase
      .from("brobot_anki_device_links")
      .update({
        status: "approved",
        exchanged_at: now,
        updated_at: now,
      })
      .eq("id", link.id);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        approved: true,
        status: "approved",
        deviceToken: rawDeviceToken,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
