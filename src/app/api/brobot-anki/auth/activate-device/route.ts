import { NextResponse } from "next/server";

import { recordAnkiProductEvent } from "@/lib/analytics/anki-usage";
import { authenticateBroBotAnkiRequest, isoNow } from "../../_lib";

export async function POST(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request, {
      allowProvisionalDeviceToken: true,
    });
    if ("response" in auth) return auth.response;
    if (auth.authMethod !== "device_token" || !auth.deviceTokenId) {
      return NextResponse.json(
        { error: "Device token authentication required." },
        { status: 403 },
      );
    }

    const now = isoNow();
    const client = request.headers.get("x-snaportho-client") || "";
    const appVersion =
      client.match(/^reviewer-addon\/(\d+\.\d+\.\d+)$/)?.[1] ?? null;
    const reportedOs = request.headers.get("x-snaportho-os")?.toLowerCase();
    const osFamily =
      reportedOs === "windows" ||
      reportedOs === "darwin" ||
      reportedOs === "linux"
        ? reportedOs === "darwin"
          ? "mac"
          : reportedOs
        : "unknown";
    const { data: activatedToken, error } = await auth.supabase
      .from("brobot_anki_device_tokens")
      .update({
        activated_at: now,
        provisional_expires_at: null,
        updated_at: now,
      })
      .eq("id", auth.deviceTokenId)
      .eq("user_id", auth.userId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!activatedToken) {
      return NextResponse.json(
        { error: "Device token was revoked before activation." },
        { status: 409 },
      );
    }

    void Promise.all([
      recordAnkiProductEvent({
        eventName: "anki_credential_store_succeeded",
        userId: auth.userId,
        surface: "anki_device_link",
        appVersion,
        properties: {
          device_token_id: auth.deviceTokenId,
          os_family: osFamily,
        },
      }),
      recordAnkiProductEvent({
        eventName: "anki_link_verified",
        userId: auth.userId,
        surface: "anki_device_link",
        appVersion,
        properties: {
          device_token_id: auth.deviceTokenId,
          os_family: osFamily,
        },
      }),
      recordAnkiProductEvent({
        eventName: "anki_device_linked",
        userId: auth.userId,
        surface: "anki_device_link",
        appVersion,
        properties: {
          device_token_id: auth.deviceTokenId,
          activation_ack: true,
          os_family: osFamily,
        },
      }),
    ]);
    return NextResponse.json({ activated: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
