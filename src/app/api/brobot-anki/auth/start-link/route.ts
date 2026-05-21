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

function serverError(
  message: string,
  code: string,
  status = 500
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, startLinkSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const deviceName = parsed.data.deviceName.trim();

    console.log("[brobot-anki/auth/start-link] request received", {
      deviceNamePresent: deviceName.length > 0,
    });

    let supabase;
    try {
      supabase = createAdminClient();
    } catch (error) {
      console.error("[brobot-anki/auth/start-link] admin client init failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return serverError(
        "SnapOrtho linking failed on the server. Check production environment configuration.",
        "ADMIN_CLIENT_INIT_FAILED"
      );
    }

    let linkCode = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateLinkCode();
      const existing = await getDeviceLinkByCode(candidate);

      if (!existing.success) {
        console.error(
          "[brobot-anki/auth/start-link] link code lookup failed while generating code"
        );
        return existing.response;
      }

      if (!existing.link) {
        linkCode = candidate;
        break;
      }
    }

    if (!linkCode) {
      console.error(
        "[brobot-anki/auth/start-link] unable to generate unique link code"
      );
      return serverError(
        "Unable to generate a unique link code. Please try again.",
        "LINK_CODE_GENERATION_FAILED"
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
      console.error("[brobot-anki/auth/start-link] device link insert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return serverError(
        "SnapOrtho linking failed on the server. Check production environment/database logs.",
        "DEVICE_LINK_INSERT_FAILED"
      );
    }

    console.log("[brobot-anki/auth/start-link] device link inserted", {
      linkCodeGenerated: true,
      expiresAt,
    });

    let baseUrl = "";
    try {
      baseUrl = resolveBrowserAccessibleBaseUrl(request);
    } catch (error) {
      console.error("[brobot-anki/auth/start-link] base URL resolution failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return serverError(
        "SnapOrtho linking failed on the server. Browser approval URL could not be created.",
        "APPROVAL_URL_RESOLUTION_FAILED"
      );
    }

    console.log("[brobot-anki/auth/start-link] approval URL origin resolved", {
      origin: baseUrl,
    });

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

    console.error("[brobot-anki/auth/start-link] unexpected error", {
      error: message,
    });

    return serverError(
      "SnapOrtho linking failed on the server. Check production logs.",
      "START_LINK_UNEXPECTED_ERROR"
    );
  }
}
