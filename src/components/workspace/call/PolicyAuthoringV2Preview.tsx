"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileClock, Loader2, RefreshCw } from "lucide-react";
import type { ProgramCallPolicyDocumentV2 } from "@/lib/workspace/call/policy/authoring-document-v2";
import type { ProgramCallPolicyRevision } from "@/lib/workspace/call/policy/policy-revisions";

type Payload = {
  document: ProgramCallPolicyDocumentV2;
  revisions: ProgramCallPolicyRevision[];
  authoritativeSource: "legacy_rules";
  ruleSetUpdatedAt: string;
};

function messageFromPayload(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return fallback;
}

export default function PolicyAuthoringV2Preview({ refreshKey }: { refreshKey?: number }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProgramCallPolicyDocumentV2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/program/call-policy-v2", { credentials: "include" });
      const next = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromPayload(next, "Failed to build policy preview"));
      setPayload(next as Payload);
      setDraft((next as Payload).document);
      setEditing(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to build policy preview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // refreshKey intentionally requests a fresh projection after a legacy save.
  }, [refreshKey]);

  async function createDraft() {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/program/call-policy-v2", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document: editing ? draft : undefined }),
      });
      const next = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromPayload(next, "Failed to create draft revision"));
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create draft revision");
    } finally {
      setSaving(false);
    }
  }

  async function activateLatest() {
    const revision = payload?.revisions.find((item) => item.status === "draft");
    if (!payload || !revision) return;
    if (!window.confirm(`Activate policy revision r${revision.revision_number}? This will replace the active rules transactionally.`)) return;
    try {
      setActivating(true);
      setError(null);
      const response = await fetch(`/api/program/call-policy-v2/${revision.id}/activate`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmation: "ACTIVATE",
          previousRuleSetUpdatedAt: payload.ruleSetUpdatedAt,
        }),
      });
      const next = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromPayload(next, "Failed to activate revision"));
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to activate revision");
    } finally {
      setActivating(false);
    }
  }

  if (loading && !payload) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Building policy preview…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mt-5 rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error ?? "Policy preview unavailable."}
      </div>
    );
  }

  const latestRevision = payload.revisions[0] ?? null;
  const latestDraft = payload.revisions.find((revision) => revision.status === "draft") ?? null;
  const shownDocument = editing && draft ? draft : payload.document;

  function updateSource(
    panelId: ProgramCallPolicyDocumentV2["panels"][number]["id"],
    sourceId: string,
    update: (source: ProgramCallPolicyDocumentV2["panels"][number]["sources"][number]) => void
  ) {
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      const source = next.panels
        .find((panel) => panel.id === panelId)
        ?.sources.find((item) => item.sourceId === sourceId);
      if (source) update(source);
      return next;
    });
  }
  return (
    <section className="mt-5 rounded-[1.35rem] border border-sky-200 bg-sky-50/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileClock className="h-5 w-5 text-sky-700" />
            <h3 className="text-sm font-semibold text-slate-950">Policy authoring v2 preview</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Read-only six-panel projection. Legacy rules remain authoritative until parity approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(payload.document));
              setEditing((value) => !value);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800"
          >
            {editing ? "Cancel editing" : "Edit workload & spacing"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void createDraft()}
            disabled={saving || shownDocument.compatibility.blockers.length > 0}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileClock className="h-3.5 w-3.5" />}
            {editing ? "Validate & save draft" : "Save snapshot revision"}
          </button>
          <button
            type="button"
            onClick={() => void activateLatest()}
            disabled={!latestDraft || latestDraft.parity_status !== "passed" || activating}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Activate tested draft
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {shownDocument.panels.map((panel) => (
          <div key={panel.id} className="rounded-xl bg-white px-3 py-3 ring-1 ring-sky-100">
            <p className="text-xs font-semibold text-slate-900">{panel.title}</p>
            <p className="mt-1 text-xs text-slate-500">{panel.sources.length} source rules</p>
            <ul className="mt-2 space-y-1.5">
              {panel.sources.map((source) => (
                <li key={source.sourceId} className="rounded-lg border border-slate-100 p-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate text-slate-700" title={source.name}>
                      {source.name}
                    </span>
                    {editing && (panel.id === "workload" || panel.id === "spacingPreferences") ? (
                      <label className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={source.enabled}
                          onChange={(event) =>
                            updateSource(panel.id, source.sourceId, (item) => {
                              item.enabled = event.target.checked;
                            })
                          }
                        />
                        Enabled
                      </label>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {source.enabled ? source.severity : "off"}
                      </span>
                    )}
                  </div>
                  {editing && panel.id === "workload" && source.sourceType === "monthly_load_target_by_pgy" ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        ["targetMinCalls", "Min"],
                        ["targetMaxCalls", "Target max"],
                        ["targetHardMaxCalls", "Hard max"],
                      ].map(([key, label]) => (
                        <label key={key} className="text-[10px] text-slate-500">
                          {label}
                          <input
                            type="number"
                            min={0}
                            value={Number(source.config[key] ?? 0)}
                            onChange={(event) =>
                              updateSource(panel.id, source.sourceId, (item) => {
                                item.config[key] = Number(event.target.value);
                              })
                            }
                            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-900"
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {editing && panel.id === "spacingPreferences" && source.sourceType === "min_days_between_assignments" ? (
                    <label className="mt-2 block text-[10px] text-slate-500">
                      Minimum days between assignments
                      <input
                        type="number"
                        min={0}
                        value={Number(source.config.minDays ?? 0)}
                        onChange={(event) =>
                          updateSource(panel.id, source.sourceId, (item) => {
                            item.config.minDays = Number(event.target.value);
                          })
                        }
                        className="mt-1 w-28 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-900"
                      />
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" /> {payload.document.compatibility.blockers.length} blockers
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5" /> {payload.document.compatibility.warnings.length} migrations to consolidate
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
          {payload.document.relationships.length} explicit relationships
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
          Latest draft: {latestRevision ? `r${latestRevision.revision_number}` : "none"}
        </span>
        {latestRevision ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
            Parity: {latestRevision.parity_status} · {latestRevision.parity_report.evaluations.toLocaleString()} checks
          </span>
        ) : null}
      </div>

      {payload.document.relationships.length > 0 ? (
        <div className="mt-3 rounded-xl bg-white px-3 py-3 ring-1 ring-sky-100">
          <p className="text-xs font-semibold text-slate-900">Explicit policy relationships</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {payload.document.relationships.map((relationship) => (
              <li key={relationship.id}>
                {relationship.id.replaceAll("-", " ")} · {relationship.sourceRuleIds.length} source
                {relationship.sourceRuleIds.length === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {payload.document.compatibility.warnings.length > 0 ? (
        <details className="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-xs text-amber-950 ring-1 ring-amber-200">
          <summary className="cursor-pointer font-semibold">Migration notes</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {payload.document.compatibility.warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {error ? <p className="mt-3 text-xs font-medium text-rose-700">{error}</p> : null}
    </section>
  );
}
