import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { recordAnkiProductEvent } from "@/lib/analytics/anki-usage";
import { createClient } from "@/utils/supabase/server";

const ADDON_VERSION = "1.0.4";
const ADDON_FILENAME = `snaportho-${ADDON_VERSION}.ankiaddon`;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in?redirectTo=%2Fanki%2Fdownload", request.url));
  }

  try {
    const addon = await readFile(path.join(process.cwd(), "dist", ADDON_FILENAME));
    try {
      await Promise.all([
        recordAnkiProductEvent({
          eventName: "anki_addon_downloaded",
          userId: user.id,
          surface: "anki_addon_download",
          appVersion: ADDON_VERSION,
          properties: { addon_version: ADDON_VERSION },
        }),
        recordAnkiProductEvent({
          eventName: "anki_addon_first_downloaded",
          userId: user.id,
          surface: "anki_addon_download",
          appVersion: ADDON_VERSION,
          properties: { addon_version: ADDON_VERSION },
        }),
      ]);
    } catch (error) {
      console.error("Unable to record Anki add-on download", error);
    }
    return new NextResponse(new Uint8Array(addon), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${ADDON_FILENAME}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to read the SnapOrtho add on package", error);
    try {
      await recordAnkiProductEvent({
        eventName: "anki_setup_failed",
        userId: user.id,
        surface: "anki_addon_download",
        appVersion: ADDON_VERSION,
        properties: { code: "download_unavailable", addon_version: ADDON_VERSION },
      });
    } catch (analyticsError) {
      console.error("Unable to record Anki download failure", analyticsError);
    }
    return NextResponse.json({ error: "download unavailable" }, { status: 503 });
  }
}
