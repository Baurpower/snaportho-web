/**
 * CasePrep v1.1 packet SSE proxy (web only).
 *
 * Additive sibling of /api/case-prep/v1.1 — the iOS-facing /api/brobot/ask
 * proxy is untouched. Responsibilities:
 *   1. Entitlement gate BEFORE opening the upstream stream.
 *   2. Pass-through of the FastAPI SSE stream with progressive flushing.
 *   3. Quota: exactly one recordSuccessfulAIUse per packet, on first section.
 *      Clarification-only streams do not consume quota.
 *   4. Optional knowledge-graph "related_concepts" section injection.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCasePrepInternalBaseUrl } from "@/lib/config/brobot";
import { isCasePrepKgEnabled, isCasePrepStreamEnabled } from "@/lib/caseprep-v1-1/flags";
import {
  createSseParseState,
  encodeSseEvent,
  parseSseChunk,
  type SseEvent,
} from "@/lib/caseprep-v1-1/sse";
import { getBroBotAccessGate } from "@/lib/brobot/brobot-entitlement-access";
import { createGuestSession, getGuestSessionFromRequest } from "@/lib/brobot/guest-session";
import type { Subject } from "@/lib/brobot/entitlements";
import { recordSuccessfulAIUse, recordUsageEvent } from "@/lib/brobot/usage";
import { createClient } from "@/utils/supabase/server";
import { BoundedTtlCache } from "@/lib/brobot/kg/cache";
import {
  findProductionKgTopics,
  getProductionKgNeighborhood,
  type KgProductionNeighborhood,
} from "@/lib/education/kg-production";

export const runtime = "nodejs";
// Cold-cache packets (enrichment + retrieval) can stream for 10-15s; the
// upstream fetch is capped at 60s, so keep the function alive that long.
export const maxDuration = 60;

const RequestSchema = z.object({ prompt: z.string().trim().min(1) });

const KG_DEADLINE_MS = 2500;
const KG_MAX_CONCEPTS = 8;
// Wrapped so a cached "no neighborhood" result is distinguishable from a miss.
const kgCache = new BoundedTtlCache<{ neighborhood: KgProductionNeighborhood | null }>(
  200,
  30 * 60 * 1000
);

async function resolveSubject(
  request: Request
): Promise<{ subject: Subject; guestCookie: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return { subject: { type: "user", id: user.id }, guestCookie: null };
  } catch {
    // fall through to guest handling
  }
  const existing = getGuestSessionFromRequest(request);
  if (existing) return { subject: { type: "guest", id: existing.guestId }, guestCookie: null };
  const created = createGuestSession();
  return { subject: { type: "guest", id: created.session.guestId }, guestCookie: created.cookie };
}

async function fetchRelatedConcepts(slug: string): Promise<KgProductionNeighborhood | null> {
  const cached = kgCache.get(slug);
  if (cached !== null) return cached.neighborhood;
  try {
    const supabase = await createClient();
    const topics = await findProductionKgTopics(supabase, slug.replace(/_/g, " "), 3);
    const first = topics[0];
    const neighborhood = first
      ? await getProductionKgNeighborhood(supabase, first.neighborhood_slug)
      : null;
    kgCache.set(slug, { neighborhood });
    return neighborhood;
  } catch {
    kgCache.set(slug, { neighborhood: null });
    return null;
  }
}

function relatedConceptsEvent(neighborhood: KgProductionNeighborhood): string | null {
  const items = neighborhood.entities.slice(0, KG_MAX_CONCEPTS).map((entity, index) => ({
    id: `kg:${entity.id}`,
    question: entity.preferredLabel,
    answer: entity.description ?? entity.entityType.replace(/_/g, " "),
    supporting_detail: "",
    category: entity.entityType,
    source_ids: [neighborhood.releaseId],
    confidence: entity.reviewTier === "attending_reviewed" ? 0.95 : 0.75,
    generated: false,
    source: "kg",
    rank: index + 1,
  }));
  if (items.length === 0) return null;
  return encodeSseEvent("section", {
    section_id: "related_concepts",
    status: "complete",
    items,
    source: "kg",
    confidence: null,
    generated_field_paths: [],
    duration_ms: 0,
  });
}

export async function POST(request: Request) {
  if (!isCasePrepStreamEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a case." }, { status: 400 });
  }
  const { prompt } = parsed.data;
  const startedAt = Date.now();

  // 1. Entitlement gate — never open the upstream stream for a denied subject.
  const { subject, guestCookie } = await resolveSubject(request);
  const gate = await getBroBotAccessGate(subject);
  if (gate.isLimitReached) {
    const denied =
      gate.normalized.data.source === "disabled"
        ? NextResponse.json(
            { error: "disabled", message: "BroBot access is currently unavailable." },
            { status: 403 }
          )
        : NextResponse.json(
            {
              error: "daily_limit_reached",
              message: "Daily limit reached.",
              isLimitReached: true,
              remaining: 0,
              dailyCap: gate.dailyCap,
            },
            { status: 429 }
          );
    if (gate.normalized.data.source !== "disabled") {
      await recordUsageEvent({
        subject,
        outcome: "limit_hit",
        latencyMs: Date.now() - startedAt,
      });
    }
    if (guestCookie) denied.headers.append("Set-Cookie", guestCookie);
    return denied;
  }

  let baseUrl: string;
  try {
    baseUrl = getCasePrepInternalBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "Case Prep is temporarily unavailable." },
      { status: 502 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/case-prep/web/v1.1/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, entry_surface: "web_case_prep_v1_1_stream" }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: "Case Prep is temporarily unavailable." },
      { status: 502 }
    );
  }
  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: "Case Prep is temporarily unavailable." },
      { status: 502 }
    );
  }

  const upstreamBody = upstream.body;
  const kgEnabled = isCasePrepKgEnabled();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const parseState = createSseParseState();
      let usageRecorded = false;
      let kgPromise: Promise<KgProductionNeighborhood | null> | null = null;

      const recordUsageOnce = async () => {
        if (usageRecorded) return;
        usageRecorded = true; // idempotent per packet
        try {
          await recordSuccessfulAIUse(subject, Date.now() - startedAt, {});
        } catch (error) {
          console.error("[CASEPREP-V11-STREAM] usage record failed", error);
        }
      };

      const handleEvent = (event: SseEvent) => {
        if (event.event === "header" && kgEnabled && !kgPromise) {
          const slug = (event.data as { case?: { canonical_slug?: string | null } })?.case
            ?.canonical_slug;
          if (slug) kgPromise = fetchRelatedConcepts(slug);
        }
        if (event.event === "section" && !usageRecorded) {
          void recordUsageOnce();
        }
      };

      const flushKgSection = async () => {
        if (!kgPromise) return;
        try {
          const neighborhood = await Promise.race([
            kgPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), KG_DEADLINE_MS)),
          ]);
          if (neighborhood) {
            const frame = relatedConceptsEvent(neighborhood);
            if (frame) streamController.enqueue(encoder.encode(frame));
          }
        } catch {
          // KG is best-effort; never block or fail the packet on it.
        }
      };

      const reader = upstreamBody.getReader();
      try {
        let pendingDoneFrame: string | null = null;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          const events = parseSseChunk(parseState, chunkText);
          let forwardText = chunkText;
          for (const event of events) {
            handleEvent(event);
            if (event.event === "done" && kgPromise) {
              // Hold the done frame until KG settles (bounded) so the packet's
              // last data event is still followed by done.
              const doneIndex = chunkText.lastIndexOf("event: done");
              if (doneIndex >= 0) {
                forwardText = chunkText.slice(0, doneIndex);
                pendingDoneFrame = chunkText.slice(doneIndex);
              }
            }
          }
          if (forwardText) streamController.enqueue(encoder.encode(forwardText));
          if (pendingDoneFrame) {
            await flushKgSection();
            streamController.enqueue(encoder.encode(pendingDoneFrame));
            pendingDoneFrame = null;
            kgPromise = null;
          }
        }
      } catch (error) {
        streamController.enqueue(
          encoder.encode(encodeSseEvent("error", { message: "Case Prep stream interrupted." }))
        );
        console.error("[CASEPREP-V11-STREAM] proxy error", error);
      } finally {
        clearTimeout(timeout);
        streamController.close();
      }
    },
    cancel() {
      clearTimeout(timeout);
      controller.abort();
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (guestCookie) headers.append("Set-Cookie", guestCookie);
  return new Response(stream, { status: 200, headers });
}
