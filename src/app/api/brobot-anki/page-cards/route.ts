/* eslint-disable @typescript-eslint/no-explicit-any -- the additive RPC lands with this route. */
import { NextResponse } from "next/server";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";
import {
  canonicalLearningPageUrl,
  pageReviewCard,
  type PageCardProvider,
} from "@/lib/education/page-anki-cards";

export async function POST(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  if (auth.authMethod !== "device_token") {
    return NextResponse.json({ error: "Device authentication required" }, { status: 401 });
  }
  const raw = await request.json().catch(() => null) as { pageUrl?: unknown; provider?: unknown } | null;
  const provider = raw?.provider;
  if (provider !== "orthobullets" && provider !== "rock") {
    return NextResponse.json({ error: "Unsupported learning-page provider" }, { status: 400 });
  }
  const pageUrl = canonicalLearningPageUrl(String(raw?.pageUrl ?? ""), provider as PageCardProvider);
  if (!pageUrl) return NextResponse.json({ error: "Invalid learning-page URL" }, { status: 400 });

  const { data, error } = await (auth.supabase as any).rpc("find_published_anki_cards_by_resource_url", {
    resource_url: pageUrl,
    resource_field: provider === "rock" ? "ROCK_Link" : "Orthobullets_Link",
    result_limit: 50,
  });
  if (error) return NextResponse.json({ error: "Page card lookup unavailable" }, { status: 503 });
  return NextResponse.json({
    provider,
    pageUrl,
    cards: (data ?? []).map(pageReviewCard),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

