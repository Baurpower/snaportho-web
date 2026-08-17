"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

import type { CasePrepPacketState } from "@/lib/caseprep-v1-1/stream-schema";
import type { BroBotReadingRecommendation } from "@/lib/brobot/reading/types";

type ReferencesResponse = {
  recommendationSetId: string;
  topic: string;
  generatedFrom: "curated" | "live" | "hybrid" | "cached";
  resources: Array<Omit<BroBotReadingRecommendation, "rankScore">>;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: ReferencesResponse }
  | { status: "error"; message: string };

function sourceHints(state: CasePrepPacketState) {
  const hints: Array<{ title?: string; url: string }> = [];
  for (const item of state.sections.evidence?.items ?? []) {
    if (item.answer.startsWith("http"))
      hints.push({ title: item.question, url: item.answer });
  }
  const sources = (state.sections.sources?.payload?.sources ?? []) as Array<{
    title?: unknown;
    url?: unknown;
  }>;
  for (const source of sources) {
    if (typeof source.url === "string" && source.url.startsWith("http")) {
      hints.push({
        title: typeof source.title === "string" ? source.title : undefined,
        url: source.url,
      });
    }
  }
  return hints.slice(0, 12);
}

function resourceTypeLabel(resource: ReferencesResponse["resources"][number]) {
  if (resource.pmid) return "PubMed";
  return resource.resourceType.replaceAll("_", " ");
}

export function HighYieldReferences({
  state,
  active,
}: {
  state: CasePrepPacketState;
  active: boolean;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const identity = state.caseIdentity;
  const header = state.header;
  const hints = useMemo(() => sourceHints(state), [state]);
  const requestKey = `${state.packetId ?? "none"}:${identity?.canonical_slug ?? "none"}`;

  useEffect(() => {
    setLoadState({ status: "idle" });
  }, [requestKey]);

  useEffect(() => {
    if (
      !active ||
      !identity?.canonical_slug ||
      !header ||
      loadState.status !== "idle"
    )
      return;
    const controller = new AbortController();
    setLoadState({ status: "loading" });
    void fetch("/api/case-prep/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packetId: state.packetId,
        canonicalSlug: identity.canonical_slug,
        displayName: identity.canonical_name || header.display_name,
        requestedCase: identity.requested_case,
        specialty: header.specialty,
        region: header.region,
        procedureType: header.procedure_type,
        trainingLevel: header.pgy_level,
        sourceHints: hints,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response
          .json()
          .catch(() => null)) as ReferencesResponse | null;
        if (!response.ok || !body)
          throw new Error("High-yield references are temporarily unavailable.");
        setLoadState({ status: "ready", data: body });
        void recordEvent({ eventType: "panel_open", data: body });
        body.resources.forEach((resource) => {
          void recordEvent({
            eventType: "impression",
            data: body,
            resourceId: resource.id,
            rankPosition: resource.rankPosition,
          });
        });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setLoadState({ status: "error", message: error.message });
        }
      });
    return () => {
      controller.abort();
      setLoadState((current) =>
        current.status === "loading" ? { status: "idle" } : current,
      );
    };
    // Reloads are keyed to the packet/procedure; hints arriving later do not restart a live request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, identity?.canonical_slug, header, requestKey]);

  function recordEvent(params: {
    eventType: "panel_open" | "impression" | "click";
    data: ReferencesResponse;
    resourceId?: string;
    rankPosition?: number;
  }) {
    return fetch("/api/case-prep/references/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packetId: state.packetId,
        canonicalSlug: identity?.canonical_slug,
        recommendationSetId: params.data.recommendationSetId,
        resourceId: params.resourceId,
        eventType: params.eventType,
        rankPosition: params.rankPosition,
        topic: params.data.topic,
        trainingLevel: header?.pgy_level,
        generatedFrom: params.data.generatedFrom,
      }),
    }).catch(() => undefined);
  }

  if (loadState.status === "idle" || loadState.status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <ArrowPathIcon className="h-4 w-4 animate-spin text-teal-600" />
        Finding verified high-yield resources…
      </div>
    );
  }
  if (loadState.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        {loadState.message}
      </div>
    );
  }
  if (loadState.data.resources.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        No verified high-yield references were found for this procedure yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {loadState.data.resources.map((resource) => (
        <article
          key={resource.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
              {resourceTypeLabel(resource)}
            </span>
            {(resource.badges ?? []).slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-start gap-3">
            <BookOpenIcon className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-5 text-slate-950">
                {resource.title}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {resource.sourceName}
                {resource.journal ? ` · ${resource.journal}` : ""}
                {resource.year ? ` · ${resource.year}` : ""}
                {resource.pmid ? ` · PMID ${resource.pmid}` : ""}
                {typeof resource.citationCount === "number"
                  ? ` · ${resource.citationCount} citations`
                  : ""}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {resource.bestFor || resource.whyItMatters}
              </p>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  void recordEvent({
                    eventType: "click",
                    data: loadState.data,
                    resourceId: resource.id,
                    rankPosition: resource.rankPosition,
                  })
                }
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
              >
                Open resource
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
