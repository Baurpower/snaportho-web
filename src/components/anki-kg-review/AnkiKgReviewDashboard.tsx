"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  ReviewDashboardPayload,
  ReviewActionInput,
} from "@/lib/education/anki-kg-review";

type DashboardProps = {
  initialData: ReviewDashboardPayload;
  reviewerName: string | null;
  reviewerRole: string;
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${tone}`}>
      <div className="text-3xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function stringifyError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toQueryString(filters: ReviewDashboardPayload["filters"]) {
  const params = new URLSearchParams();
  params.set("batchId", filters.batchId);
  params.set("runId", filters.runId);
  if (filters.deckBranch) params.set("deckBranch", filters.deckBranch);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.curriculumNodeSlug) params.set("curriculumNodeSlug", filters.curriculumNodeSlug);
  if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
  if (filters.confidenceBand && filters.confidenceBand !== "all") {
    params.set("confidenceBand", filters.confidenceBand);
  }
  if (filters.mappedState && filters.mappedState !== "all") {
    params.set("mappedState", filters.mappedState);
  }
  if (filters.sourceTagMode && filters.sourceTagMode !== "all") {
    params.set("sourceTagMode", filters.sourceTagMode);
  }
  return params.toString();
}

export function AnkiKgReviewDashboard({
  initialData,
  reviewerName,
  reviewerRole,
}: DashboardProps) {
  const [data, setData] = useState(initialData);
  const [draftFilters, setDraftFilters] = useState(initialData.filters);
  const [isLoading, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableDeckBranches = useMemo(
    () =>
      [...new Set(data.coverageByDeckBranch.map((row) => row.deck_branch).filter(Boolean))]
        .sort() as string[],
    [data.coverageByDeckBranch]
  );
  const availableTags = useMemo(
    () => [...new Set(data.coverageByTag.map((row) => row.tag_name).filter(Boolean))].sort(),
    [data.coverageByTag]
  );
  const availableNodeSlugs = useMemo(
    () =>
      [
        ...new Set(
          [
            ...data.needsReviewCandidates.map((row) => row.curriculum_node_slug).filter(Boolean),
            ...data.appliedMappings.map((row) => row.curriculum_node_slug).filter(Boolean),
          ]
        ),
      ].sort() as string[],
    [data.needsReviewCandidates, data.appliedMappings]
  );

  async function reload(nextFilters = draftFilters) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/anki-kg-review?${toQueryString(nextFilters)}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json?.error ?? "Unable to reload Anki KG review dashboard.");
        }
        setData(json.data);
        setDraftFilters(json.data.filters);
      } catch (err) {
        setError(stringifyError(err));
      }
    });
  }

  async function previewAndRunAction(payload: ReviewActionInput, confirmationLabel: string) {
    setError(null);
    setNotice(null);
    try {
      if (payload.action === "bulk_approve_high_confidence_branch" || payload.action === "bulk_reject_source_only") {
        const previewResponse = await fetch("/api/admin/anki-kg-review/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, previewOnly: true }),
        });
        const previewJson = await previewResponse.json();
        if (!previewResponse.ok) {
          throw new Error(previewJson?.error ?? "Unable to preview review action.");
        }
        const matchedCount = Number(previewJson.data?.matchedCount ?? 0);
        if (matchedCount === 0) {
          setNotice(`No candidates matched for ${confirmationLabel}.`);
          return;
        }
        const confirmed = window.confirm(`${confirmationLabel} will update ${matchedCount} candidate(s). Continue?`);
        if (!confirmed) {
          return;
        }
      }

      const response = await fetch("/api/admin/anki-kg-review/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Unable to apply review action.");
      }
      setNotice(`${confirmationLabel} complete for ${json.data?.updatedCount ?? json.data?.matchedCount ?? 0} candidate(s).`);
      await reload(data.filters);
    } catch (err) {
      setError(stringifyError(err));
    }
  }

  const summary = data.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Internal Review
          </div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Anki KG Mapping Review</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Review deterministic Anki-to-KG mappings without touching Anki scheduling, card text,
            or downstream LLM workflows.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Reviewer: {reviewerName ?? "Unknown"} · Role: {reviewerRole}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Current run: <span className="font-mono">{data.filters.runId}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <SummaryCard label="Total Cards" value={summary.total_cards} tone="border-gray-200" />
        <SummaryCard label="Mapped Cards" value={summary.mapped_cards} tone="border-emerald-200" />
        <SummaryCard label="Unmapped Cards" value={summary.unmapped_cards} tone="border-amber-200" />
        <SummaryCard
          label="Needs-Review Candidates"
          value={summary.needs_review_candidates}
          tone="border-rose-200"
        />
        <SummaryCard label="Applied Links" value={summary.applied_links} tone="border-sky-200" />
        <SummaryCard label="Approved Links" value={summary.approved_links} tone="border-violet-200" />
        <SummaryCard
          label="Coverage"
          value={`${summary.coverage_percentage}%`}
          tone="border-indigo-200"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <p className="text-sm text-gray-500">
              Narrow by branch, tag, confidence, mapping state, provenance-heavy cards, or target node.
            </p>
          </div>
          {data.recommendedFirstReviewBranch && (
            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              Recommended first branch:{" "}
              <button
                className="font-semibold underline decoration-indigo-300 underline-offset-2"
                onClick={() => {
                  const next = { ...draftFilters, deckBranch: data.recommendedFirstReviewBranch ?? "" };
                  setDraftFilters(next);
                  void reload(next);
                }}
              >
                {data.recommendedFirstReviewBranch}
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Deck Branch"
            value={draftFilters.deckBranch ?? ""}
            options={["", ...availableDeckBranches]}
            onChange={(value) => setDraftFilters((current) => ({ ...current, deckBranch: value }))}
          />
          <Select
            label="Tag"
            value={draftFilters.tag ?? ""}
            options={["", ...availableTags]}
            onChange={(value) => setDraftFilters((current) => ({ ...current, tag: value }))}
          />
          <Select
            label="Confidence"
            value={draftFilters.confidenceBand}
            options={["all", "high", "medium", "low"]}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                confidenceBand: value as ReviewDashboardPayload["filters"]["confidenceBand"],
              }))
            }
          />
          <Select
            label="Mapped State"
            value={draftFilters.mappedState}
            options={["all", "applied", "needs_review", "unmapped"]}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                mappedState: value as ReviewDashboardPayload["filters"]["mappedState"],
              }))
            }
          />
          <Select
            label="Source Tags"
            value={draftFilters.sourceTagMode}
            options={["all", "has_source_tags", "source_only"]}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                sourceTagMode: value as ReviewDashboardPayload["filters"]["sourceTagMode"],
              }))
            }
          />
          <Select
            label="Candidate Status"
            value={draftFilters.reviewStatus ?? ""}
            options={["", "needs_review", "auto_mapped", "approved", "rejected"]}
            onChange={(value) => setDraftFilters((current) => ({ ...current, reviewStatus: value }))}
          />
          <Select
            label="Curriculum Node"
            value={draftFilters.curriculumNodeSlug ?? ""}
            options={["", ...availableNodeSlugs]}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, curriculumNodeSlug: value }))
            }
          />
          <div className="flex items-end gap-2">
            <button
              onClick={() => void reload(draftFilters)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {isLoading ? "Loading…" : "Apply Filters"}
            </button>
            <button
              onClick={() => {
                setDraftFilters({
                  ...data.filters,
                  deckBranch: "",
                  tag: "",
                  confidenceBand: "all",
                  mappedState: "all",
                  sourceTagMode: "all",
                  curriculumNodeSlug: "",
                  reviewStatus: "",
                });
                void reload({
                  ...data.filters,
                  deckBranch: "",
                  tag: "",
                  confidenceBand: "all",
                  mappedState: "all",
                  sourceTagMode: "all",
                  curriculumNodeSlug: "",
                  reviewStatus: "",
                });
              }}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {(notice || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Coverage by Deck Branch</h2>
            <p className="text-sm text-gray-500">
              Start with high-card-count branches that still have large unmapped or needs-review buckets.
            </p>
          </div>
          <button
            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            onClick={() =>
              void previewAndRunAction(
                {
                  action: "bulk_reject_source_only",
                  runId: data.filters.runId,
                  deckBranch: draftFilters.deckBranch || undefined,
                  rationale: "Bulk reject source-only or provenance-only mappings from review dashboard.",
                },
                "Bulk reject source-only mappings"
              )
            }
          >
            Bulk Reject Source-Only
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="pb-2 pr-4">Branch</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Mapped</th>
                <th className="pb-2 pr-4">Needs Review</th>
                <th className="pb-2 pr-4">Unmapped</th>
                <th className="pb-2 pr-4">Coverage</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.coverageByDeckBranch.slice(0, 20).map((row) => (
                <tr key={`${row.mapping_run_id}:${row.deck_branch}`} className="border-t border-gray-100 align-top">
                  <td className="py-3 pr-4">
                    <button
                      className="text-left font-medium text-gray-900 hover:text-indigo-700"
                      onClick={() => {
                        const next = { ...draftFilters, deckBranch: row.deck_branch ?? "" };
                        setDraftFilters(next);
                        void reload(next);
                      }}
                    >
                      {row.deck_branch || "(Unbranched)"}
                    </button>
                  </td>
                  <td className="py-3 pr-4">{row.total_cards}</td>
                  <td className="py-3 pr-4">{row.mapped_cards}</td>
                  <td className="py-3 pr-4">{row.needs_review_cards}</td>
                  <td className="py-3 pr-4">{row.unmapped_cards}</td>
                  <td className="py-3 pr-4">{row.coverage_percentage}%</td>
                  <td className="py-3">
                    <button
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      disabled={row.needs_review_cards === 0}
                      onClick={() =>
                        void previewAndRunAction(
                          {
                            action: "bulk_approve_high_confidence_branch",
                            runId: data.filters.runId,
                            deckBranch: row.deck_branch ?? undefined,
                            rationale: `Bulk-approved high-confidence branch mappings for ${row.deck_branch ?? "this branch"}.`,
                          },
                          `Bulk approve high-confidence branch ${row.deck_branch ?? ""}`
                        )
                      }
                    >
                      Bulk Approve High
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Needs-Review Candidates" subtitle="Prioritize medium-confidence and anatomy-heavy candidates before alias expansion.">
          <div className="space-y-3">
            {data.needsReviewCandidates.slice(0, 20).map((row) => (
              <div key={row.candidate_id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-gray-500">{row.deck_branch || row.deck_name}</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {row.curriculum_node_title || "Unassigned node"}{" "}
                      {row.curriculum_node_slug ? (
                        <span className="font-mono text-xs text-gray-500">({row.curriculum_node_slug})</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 line-clamp-3">{row.field_text || "No field text available."}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      <Badge>{row.mapping_confidence.toFixed(3)}</Badge>
                      <Badge>{row.review_status}</Badge>
                      {row.weak_tag_reason && <Badge tone="amber">{row.weak_tag_reason}</Badge>}
                      {row.tags.slice(0, 4).map((tag) => (
                        <Badge key={`${row.candidate_id}:${tag}`}>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:w-52 lg:justify-end">
                    <ActionButton
                      tone="emerald"
                      label="Approve"
                      onClick={() =>
                        void previewAndRunAction(
                          {
                            action: "approve_candidate",
                            runId: data.filters.runId,
                            candidateId: row.candidate_id,
                            rationale: "Approved from mapping review dashboard.",
                          },
                          "Approve candidate"
                        )
                      }
                    />
                    <ActionButton
                      tone="rose"
                      label="Reject"
                      onClick={() =>
                        void previewAndRunAction(
                          {
                            action: "reject_candidate",
                            runId: data.filters.runId,
                            candidateId: row.candidate_id,
                            rationale: "Rejected from mapping review dashboard.",
                          },
                          "Reject candidate"
                        )
                      }
                    />
                    <ActionButton
                      tone="amber"
                      label="Needs Alias"
                      onClick={() =>
                        void previewAndRunAction(
                          {
                            action: "needs_alias",
                            runId: data.filters.runId,
                            candidateId: row.candidate_id,
                            rationale: "Needs alias support before deterministic acceptance.",
                          },
                          "Mark needs alias"
                        )
                      }
                    />
                    <ActionButton
                      tone="slate"
                      label="Wrong Node"
                      onClick={() =>
                        void previewAndRunAction(
                          {
                            action: "wrong_node",
                            runId: data.filters.runId,
                            candidateId: row.candidate_id,
                            rationale: "Candidate points to the wrong curriculum node.",
                          },
                          "Mark wrong node"
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Applied Deterministic Links" subtitle="Read-only inspection of currently active deterministic links for this run.">
          <div className="space-y-3">
            {data.appliedMappings.slice(0, 20).map((row) => (
              <div key={row.card_knowledge_link_id} className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">{row.deck_branch || row.deck_name}</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {row.curriculum_node_title}{" "}
                  {row.curriculum_node_slug ? (
                    <span className="font-mono text-xs text-gray-500">({row.curriculum_node_slug})</span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-gray-600 line-clamp-3">{row.field_text || "No field text available."}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  <Badge>{row.mapping_confidence.toFixed(3)}</Badge>
                  <Badge>{row.review_status}</Badge>
                  <Badge>{row.link_method}</Badge>
                  {row.is_primary && <Badge tone="emerald">primary</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Unmapped Cards" subtitle="Highest-friction cards that still have no candidate rows for the current mapping run.">
          <div className="space-y-3">
            {data.unmappedCards.slice(0, 20).map((row) => (
              <div key={row.canonical_card_id} className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">{row.deck_branch || row.deck_name}</div>
                <div className="mt-1 text-sm text-gray-700 line-clamp-3">{row.field_text || "No field text available."}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  {row.weak_tag_reason && <Badge tone="amber">{row.weak_tag_reason}</Badge>}
                  <Badge>{row.tags.length} tags</Badge>
                  {row.tags.slice(0, 5).map((tag) => (
                    <Badge key={`${row.canonical_card_id}:${tag}`}>{tag}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alias Suggestions" subtitle="High-signal unmatched labels that could become deterministic curriculum aliases after review.">
          <div className="space-y-3">
            {data.aliasSuggestions.slice(0, 20).map((row) => (
              <div key={`${row.curriculum_node_id}:${row.normalized_alias}`} className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">{row.curriculum_node_slug}</div>
                <div className="mt-1 font-semibold text-gray-900">{row.suggested_alias}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {row.curriculum_node_title} · {row.card_count} cards · avg confidence {row.avg_confidence.toFixed(3)}
                </div>
                <div className="mt-2">
                  <Badge>{row.normalized_alias}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Coverage by Tag</h2>
        <p className="mt-1 text-sm text-gray-500">
          Useful for spotting branch-local tags that should become aliases or deterministic routing rules.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="pb-2 pr-4">Tag</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Mapped</th>
                <th className="pb-2 pr-4">Needs Review</th>
                <th className="pb-2 pr-4">Unmapped</th>
                <th className="pb-2">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {data.coverageByTag.slice(0, 30).map((row) => (
                <tr key={`${row.mapping_run_id}:${row.tag_name}`} className="border-t border-gray-100">
                  <td className="py-3 pr-4">
                    <button
                      className="font-medium text-gray-900 hover:text-indigo-700"
                      onClick={() => {
                        const next = { ...draftFilters, tag: row.tag_name };
                        setDraftFilters(next);
                        void reload(next);
                      }}
                    >
                      {row.tag_name}
                    </button>
                  </td>
                  <td className="py-3 pr-4">{row.total_cards}</td>
                  <td className="py-3 pr-4">{row.mapped_cards}</td>
                  <td className="py-3 pr-4">{row.needs_review_cards}</td>
                  <td className="py-3 pr-4">{row.unmapped_cards}</td>
                  <td className="py-3">{row.coverage_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
      >
        {options.map((option) => (
          <option key={`${label}:${option || "all"}`} value={option}>
            {option || `All ${label}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${toneClass}`}>
      {children}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone: "emerald" | "rose" | "amber" | "slate";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      : tone === "rose"
      ? "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100"
      : tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
      : "border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100";
  return (
    <button
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${cls}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
