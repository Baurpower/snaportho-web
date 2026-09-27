import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAnkiProductEvent } from "@/lib/analytics/anki-usage";
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

    const lookup = await getDeviceLinkByCode(
      parsed.data.linkCode.trim().toUpperCase(),
    );

    if (!lookup.success) {
      return lookup.response;
    }

    const { supabase, link } = lookup;

    if (!link) {
      return NextResponse.json(
        { error: "Link code not found." },
        { status: 404 },
      );
    }

    if (link.revoked_at || link.status === "revoked") {
      return NextResponse.json(
        { approved: false, status: "revoked" },
        { status: 200 },
      );
    }

    if (isExpired(link.expires_at)) {
      await supabase
        .from("brobot_anki_device_links")
        .update({ status: "expired", updated_at: isoNow() })
        .eq("id", link.id);

      return NextResponse.json(
        { approved: false, status: "expired" },
        { status: 200 },
      );
    }

    if (!link.user_id || !link.approved_at || link.status === "pending") {
      return NextResponse.json(
        { approved: false, status: "pending" },
        { status: 200 },
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
        { status: 409 },
      );
    }

    const rawDeviceToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(rawDeviceToken);
    const now = isoNow();
    const client = request.headers.get("x-snaportho-client") || "";
    const version = client.match(/^reviewer-addon\/(\d+)\.(\d+)\.(\d+)$/);
    const reportedOs = request.headers.get("x-snaportho-os")?.toLowerCase();
    const osFamily =
      reportedOs === "windows" ||
      reportedOs === "darwin" ||
      reportedOs === "linux"
        ? reportedOs === "darwin"
          ? "mac"
          : reportedOs
        : "unknown";
    const supportsActivationAck = Boolean(
      version &&
      (Number(version[1]) > 1 ||
        (Number(version[1]) === 1 && Number(version[2]) > 0) ||
        (Number(version[1]) === 1 &&
          Number(version[2]) === 0 &&
          Number(version[3]) >= 6)),
    );

    const { data: tokenRow, error: tokenError } = await supabase
      .from("brobot_anki_device_tokens")
      .insert({
        device_link_id: link.id,
        user_id: link.user_id,
        device_name: link.device_name,
        token_hash: tokenHash,
        activated_at: supportsActivationAck ? null : now,
        provisional_expires_at: supportsActivationAck
          ? new Date(Date.now() + 10 * 60_000).toISOString()
          : null,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const { data: exchangedLink, error: linkError } = await supabase
      .from("brobot_anki_device_links")
      .update({
        status: "approved",
        exchanged_at: now,
        updated_at: now,
      })
      .eq("id", link.id)
      .is("exchanged_at", null)
      .select("id")
      .maybeSingle();

    if (linkError || !exchangedLink) {
      if (tokenRow?.id) {
        await supabase
          .from("brobot_anki_device_tokens")
          .delete()
          .eq("id", tokenRow.id);
      }
      return NextResponse.json(
        { error: linkError?.message || "Link code was already exchanged." },
        { status: linkError ? 500 : 409 },
      );
    }

    if (!supportsActivationAck) {
      void recordAnkiProductEvent({
        eventName: "anki_device_linked",
        userId: link.user_id,
        surface: "anki_device_link",
        properties: {
          device_token_id: tokenRow?.id ?? null,
          legacy_activation: true,
        },
      });
    }
    void recordAnkiProductEvent({
      eventName: "anki_link_approved",
      userId: link.user_id,
      surface: "anki_device_link",
      appVersion: version ? `${version[1]}.${version[2]}.${version[3]}` : null,
      properties: {
        device_token_id: tokenRow?.id ?? null,
        activation_ack_required: supportsActivationAck,
        os_family: osFamily,
      },
    });

    return NextResponse.json(
      {
        approved: true,
        status: "approved",
        deviceToken: rawDeviceToken,
        requiresActivationAck: supportsActivationAck,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
