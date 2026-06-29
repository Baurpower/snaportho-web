'use client';

import { useEffect, useMemo, useState } from 'react';

type Subscores = {
  accuracy: number;
  question_understanding: number;
  educational_quality: number;
  specificity: number;
  clinical_utility: number;
  completeness: number;
  appropriate_level: number;
  structure: number;
  safety: number;
  hallucination_risk: number;
};

type EvaluationRow = {
  id: string;
  conversation_id: string;
  message_id: string;
  model: string | null;
  eval_model: string | null;
  mode: string | null;
  procedure: string | null;
  response_depth: string | null;
  training_level: string | null;
  overall_score: number;
  severity: string;
  requires_admin_review: boolean;
  subscores: Subscores;
  strengths: string[];
  weaknesses: string[];
  failure_labels: string[];
  missing_topics: string[];
  summary: string;
  engineering_recommendation: string;
  confidence: number;
  admin_status: 'unresolved' | 'resolved';
  admin_notes: string | null;
  created_at: string;
  question: string | null;
  response: string | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  none: 'border-gray-200',
  minor: 'border-yellow-200',
  moderate: 'border-orange-200',
  critical: 'border-red-300',
  pipeline_error: 'border-red-300',
};

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 bg-white shadow-sm ${color}`}>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      aria-label={label}
    >
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? 'bg-green-100 text-green-800'
      : score >= 75
        ? 'bg-blue-100 text-blue-800'
        : score >= 60
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm font-bold ${color}`}>
      {score}
    </span>
  );
}

function EvaluationDetail({
  evaluation,
  onResolveToggle,
  onNotesSave,
}: {
  evaluation: EvaluationRow;
  onResolveToggle: (id: string, nextStatus: 'resolved' | 'unresolved') => void;
  onNotesSave: (id: string, notes: string) => void;
}) {
  const subscoreEntries = Object.entries(evaluation.subscores) as Array<[keyof Subscores, number]>;
  const [notes, setNotes] = useState(evaluation.admin_notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesDirty = notes !== (evaluation.admin_notes ?? '');

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Question</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded-lg border border-gray-200 p-3">
            {evaluation.question ?? '(unavailable)'}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Assistant Response</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded-lg border border-gray-200 p-3 max-h-64 overflow-y-auto">
            {evaluation.response ?? '(unavailable)'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Subscores</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {subscoreEntries.map(([key, value]) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
              <div className="text-lg font-bold text-gray-900">{value}</div>
              <div className="text-[11px] text-gray-500">{key.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Strengths</div>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
            {evaluation.strengths.length ? evaluation.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>(none noted)</li>}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Weaknesses</div>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
            {evaluation.weaknesses.length ? evaluation.weaknesses.map((s, i) => <li key={i}>{s}</li>) : <li>(none noted)</li>}
          </ul>
        </div>
      </div>

      {evaluation.failure_labels.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Failure Labels</div>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.failure_labels.map((label) => (
              <span key={label} className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                {label.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Summary</div>
        <p className="text-sm text-gray-700">{evaluation.summary}</p>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Engineering Recommendation</div>
        <p className="text-sm text-gray-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          {evaluation.engineering_recommendation}
        </p>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Admin Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this evaluation…"
          rows={3}
          className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {notesDirty && (
          <button
            onClick={async () => {
              setSavingNotes(true);
              await Promise.resolve(onNotesSave(evaluation.id, notes));
              setSavingNotes(false);
            }}
            disabled={savingNotes}
            className="mt-2 px-3 py-1 text-xs font-medium rounded-lg bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {savingNotes ? 'Saving…' : 'Save Notes'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-400">
          Evaluated with {evaluation.eval_model ?? 'unknown model'} · confidence {Math.round(evaluation.confidence * 100)}%
        </span>
        <button
          onClick={() =>
            onResolveToggle(evaluation.id, evaluation.admin_status === 'resolved' ? 'unresolved' : 'resolved')
          }
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            evaluation.admin_status === 'resolved'
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {evaluation.admin_status === 'resolved' ? 'Mark Unresolved' : 'Mark Resolved'}
        </button>
      </div>
    </div>
  );
}

export function BroBotQualityDashboard({ reviewerName }: { reviewerName: string | null }) {
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [mode, setMode] = useState('');
  const [model, setModel] = useState('');
  const [failureLabel, setFailureLabel] = useState('');
  const [severity, setSeverity] = useState('');
  const [requiresReview, setRequiresReview] = useState('');
  const [adminStatus, setAdminStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (minScore) params.set('minScore', minScore);
    if (maxScore) params.set('maxScore', maxScore);
    if (mode) params.set('mode', mode);
    if (model) params.set('model', model);
    if (failureLabel) params.set('failureLabel', failureLabel);
    if (severity) params.set('severity', severity);
    if (requiresReview) params.set('requiresReview', requiresReview);
    if (adminStatus) params.set('adminStatus', adminStatus);

    setLoading(true);
    setErrorMessage(null);

    fetch(`/api/admin/brobot-quality?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load evaluations.');
        }
        return res.json();
      })
      .then((body) => setEvaluations(body.data ?? []))
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  }, [minScore, maxScore, mode, model, failureLabel, severity, requiresReview, adminStatus]);

  const modes = useMemo(
    () => [...new Set(evaluations.map((e) => e.mode).filter(Boolean) as string[])].sort(),
    [evaluations]
  );
  const models = useMemo(
    () => [...new Set(evaluations.map((e) => e.model).filter(Boolean) as string[])].sort(),
    [evaluations]
  );
  const failureLabels = useMemo(
    () => [...new Set(evaluations.flatMap((e) => e.failure_labels))].sort(),
    [evaluations]
  );

  const totalCount = evaluations.length;
  const avgScore = totalCount
    ? Math.round(evaluations.reduce((sum, e) => sum + e.overall_score, 0) / totalCount)
    : 0;
  const requiresReviewCount = evaluations.filter((e) => e.requires_admin_review).length;
  const criticalCount = evaluations.filter((e) => e.severity === 'critical' || e.severity === 'pipeline_error').length;
  const unresolvedCount = evaluations.filter((e) => e.admin_status === 'unresolved').length;

  async function handleResolveToggle(id: string, nextStatus: 'resolved' | 'unresolved') {
    const res = await fetch(`/api/admin/brobot-quality/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminStatus: nextStatus }),
    });
    if (res.ok) {
      setEvaluations((prev) =>
        prev.map((e) => (e.id === id ? { ...e, admin_status: nextStatus } : e))
      );
    }
  }

  async function handleNotesSave(id: string, notes: string) {
    const res = await fetch(`/api/admin/brobot-quality/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNotes: notes }),
    });
    if (res.ok) {
      setEvaluations((prev) =>
        prev.map((e) => (e.id === id ? { ...e, admin_notes: notes } : e))
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BroBot Quality Review</h1>
          {reviewerName && <p className="text-sm text-gray-500 mt-0.5">Welcome, {reviewerName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Loaded Evaluations" value={totalCount} color="border-gray-200" />
        <SummaryCard label="Avg Overall Score" value={avgScore} color="border-blue-200" />
        <SummaryCard label="Requires Review" value={requiresReviewCount} color="border-orange-200" />
        <SummaryCard label="Critical" value={criticalCount} color="border-red-300" />
        <SummaryCard label="Unresolved" value={unresolvedCount} color="border-yellow-200" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Min score"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Max score"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Select label="Modes" value={mode} onChange={setMode} options={modes} />
          <Select label="Models" value={model} onChange={setModel} options={models} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select label="Failure Labels" value={failureLabel} onChange={setFailureLabel} options={failureLabels} />
          <Select
            label="Severities"
            value={severity}
            onChange={setSeverity}
            options={['none', 'minor', 'moderate', 'critical', 'pipeline_error']}
          />
          <Select label="Requires Review" value={requiresReview} onChange={setRequiresReview} options={['true', 'false']} />
          <Select label="Admin Status" value={adminStatus} onChange={setAdminStatus} options={['unresolved', 'resolved']} />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{errorMessage}</div>
      )}

      <div className="space-y-3">
        <div className="text-sm text-gray-500">{loading ? 'Loading…' : `Showing ${totalCount} evaluations`}</div>

        {!loading && totalCount === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
            No evaluations match your filters.
          </div>
        )}

        <div className="space-y-2">
          {evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className={`bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-all ${
                SEVERITY_COLORS[evaluation.severity] ?? 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setExpandedId(expandedId === evaluation.id ? null : evaluation.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center gap-4 p-4 text-left"
              >
                <ScoreBadge score={evaluation.overall_score} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {evaluation.procedure || evaluation.question || '(no topic captured)'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {evaluation.mode ?? 'unknown mode'} · {evaluation.model ?? 'unknown model'} ·{' '}
                    {new Date(evaluation.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {evaluation.requires_admin_review && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                      needs review
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      evaluation.admin_status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {evaluation.admin_status}
                  </span>
                </div>
              </button>
              {expandedId === evaluation.id && (
                <EvaluationDetail
                  evaluation={evaluation}
                  onResolveToggle={handleResolveToggle}
                  onNotesSave={handleNotesSave}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
