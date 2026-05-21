import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateLinkCode,
  getDeviceLinkByCode,
  isoNow,
  parseJsonBody,
  plusMinutesIso,
} from "../../_lib";
import { resolveBrowserAccessibleBaseUrl } from "@/lib/brobot-anki/url";
import { createAdminClient } from "@/lib/supabase/admin";

const startLinkSchema = z.object({
  deviceName: z.string().trim().min(1, "deviceName is required.").max(120),
});

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, startLinkSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const supabase = createAdminClient();
    const deviceName = parsed.data.deviceName.trim();

    let linkCode = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateLinkCode();
      const existing = await getDeviceLinkByCode(candidate);

      if (!existing.success) {
        return existing.response;
      }

      if (!existing.link) {
        linkCode = candidate;
        break;
      }
    }

    if (!linkCode) {
      return NextResponse.json(
        { error: "Unable to generate a unique link code. Please try again." },
        { status: 500 }
      );
    }

    const expiresAt = plusMinutesIso(15);
    const { error } = await supabase.from("brobot_anki_device_links").insert({
      link_code: linkCode,
      device_name: deviceName,
      status: "pending",
      created_at: isoNow(),
      updated_at: isoNow(),
      expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseUrl = resolveBrowserAccessibleBaseUrl(request);
    const approvalUrl = new URL(
      `/brobot-decks/link?code=${encodeURIComponent(linkCode)}`,
      `${baseUrl}/`
    ).toString();

    return NextResponse.json(
      {
        linkCode,
        approvalUrl,
        expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
