/** Authenticated, centrally-entitled CasePrep v1.3 RAG-first SSE proxy. */
export const runtime = "nodejs";
export const maxDuration = 60;

import { POST as proxyCasePrepStream } from "@/app/api/case-prep/v1.1/stream/route";

export async function POST(request: Request) {
  return proxyCasePrepStream(request);
}
