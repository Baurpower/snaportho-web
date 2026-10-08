import { NextResponse } from "next/server";

import { addonReleaseStatus } from "@/lib/anki/addon-release";
import { addonVersionFromClientHeader } from "@/lib/education/deck-addon-version";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientVersion = addonVersionFromClientHeader(
    request.headers.get("x-snaportho-client"),
  );
  return NextResponse.json(addonReleaseStatus(clientVersion, new URL(request.url).origin), {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
