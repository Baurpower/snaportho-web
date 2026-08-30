import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const ADDON_VERSION = "1.0.3";
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
    return NextResponse.json({ error: "download unavailable" }, { status: 503 });
  }
}
