import { NextResponse } from "next/server";
import { MyCasesMediaError } from "./types";
export function mediaErrorResponse(error: unknown, startedAt: number, assetId?: string) {
  const safe = error instanceof MyCasesMediaError ? error : new MyCasesMediaError("unexpected_error", "Educational media request failed.", 500);
  const safeAssetId = assetId && /^[0-9a-f-]{36}$/i.test(assetId) ? assetId : null;
  console.warn("[mycases-media]", { assetId:safeAssetId, code:safe.code, status:safe.status, durationMs:Date.now()-startedAt });
  return NextResponse.json({ error:safe.message, code:safe.code }, { status:safe.status });
}
