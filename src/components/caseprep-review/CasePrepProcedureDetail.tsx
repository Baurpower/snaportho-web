"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  ProcedureDetail,
  ClinicalSection,
  CasePrepSectionReview,
  ValidationWarning,
  SectionReviewStatus,
} from "@/lib/caseprep-review/types";
import type { CasePrepReviewerRole } from "@/lib/caseprep-review/types";
import { CasePrepStatusBadge } from "./CasePrepStatusBadge";
import { CasePrepWarningPanel } from "./CasePrepWarningPanel";
import { CasePrepSectionRenderer } from "./CasePrepSectionRenderer";
import { computeReviewProgress } from "@/lib/caseprep-review/review-utils";
import { CERTIFIER_ROLES, REQUIRED_SECTIONS } from "@/lib/caseprep-review/constants";

interface CasePrepProcedureDetailProps {
  procedure: ProcedureDetail;
  initialReviews: CasePrepSectionReview[];
  reviewerRole: CasePrepReviewerRole;
  reviewerName: string | null;
}

const SECTION_ORDER = [
  "indications",
  "setup_positioning",
  "approach_landmarks",
  "surgical_layers",
  "structures_at_risk",
  "implant_strategy",
  "reduction_or_fluoro_checkpoints",
  "pitfalls",
  "attending_pimp_questions",
  "postop_plan",
  "sources",
];

export const SECTION_LABEL_OVERRIDES: Record<string, string> = {
  indications: "Indications",
  setup_positioning: "Setup & Positioning",
  approach_landmarks: "Approach & Landmarks",
  surgical_layers: "Surgical Layers",
  structures_at_risk: "Structures at Risk",
  implant_strategy: "Implant Strategy",
  reduction_or_fluoro_checkpoints: "Reduction / Fluoro",
  pitfalls: "Pitfalls",
  attending_pimp_questions: "Attending Pimp Questions",
  postop_plan: "Post-op Protocol",
  sources: "Sources",
};

function sectionTabDot(
  section: ClinicalSection,
  status: SectionReviewStatus | undefined
): React.ReactNode {
  if (status === "approved") {
    return <span className="ml-1.5 text-green-500 text-xs">✓</span>;
  }
  if (status === "needs_improvement") {
    return <span className="ml-1.5 text-orange-500 text-xs">⚑</span>;
  }
  if (section.is_empty && section.is_required) {
    return <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-400" />;
  }
  if (!section.is_empty) {
    return <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />;
  }
  return <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-gray-200" />;
}

function pickInitialSection(
  sorted: ClinicalSection[],
  reviewMap: Map<string, SectionReviewStatus>
): string {
  const unreviewedRequired = sorted.find(
    (s) =>
      REQUIRED_SECTIONS.has(s.key) &&
      (!reviewMap.has(s.key) || reviewMap.get(s.key) === "unreviewed")
  );
  if (unreviewedRequired) return unreviewedRequired.key;

  const needsWork = sorted.find((s) => reviewMap.get(s.key) === "needs_improvement");
  if (needsWork) return needsWork.key;

  return sorted[0]?.key ?? "";
}

export function CasePrepProcedureDetail({
  procedure,
  initialReviews,
  reviewerRole,
  reviewerName,
}: CasePrepProcedureDetailProps) {
  const sorted = useMemo(
    () =>
      [...procedure.sections].sort((a, b) => {
        const ai = SECTION_ORDER.indexOf(a.key);
        const bi = SECTION_ORDER.indexOf(b.key);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }),
    [procedure.sections]
  );

  // procedureState: updated from certify response so metadata reflects post-cert state
  const [procedureState, setProcedureState] = useState<ProcedureDetail>(procedure);
  const [reviews, setReviews] = useState<CasePrepSectionReview[]>(initialReviews);
  const [sections, setSections] = useState<ClinicalSection[]>(sorted);
  const [coverageScore, setCoverageScore] = useState(procedure.coverage_score ?? 0);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>(
    procedure.validation_warnings
  );
  const [certifying, setCertifying] = useState(false);
  const [certifyError, setCertifyError] = useState<string | null>(null);
  const [certifyWarning, setCertifyWarning] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const certified =
    procedureState.content_status === "certified" ||
    procedureState.review_status === "certified";

  const reviewMap = useMemo(
    () => new Map(reviews.map((r) => [r.section_key, r.status as SectionReviewStatus])),
    [reviews]
  );

  const initialKey = useMemo(
    () => pickInitialSection(sections, reviewMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // compute once on mount
  );
  const [activeKey, setActiveKey] = useState(initialKey || (sections[0]?.key ?? ""));

  // Guard tab/next navigation when there are unsaved edits.
  const safeSetActiveKey = useCallback(
    (nextKey: string) => {
      if (nextKey === activeKey) return;
      if (isDirty) {
        if (
          !window.confirm(
            "You have unsaved edits. Discard changes and continue?"
          )
        ) {
          return;
        }
        setIsDirty(false);
      }
      setActiveKey(nextKey);
    },
    [activeKey, isDirty]
  );

  const activeSection = sections.find((s) => s.key === activeKey) ?? sections[0];
  const activeReview = reviews.find((r) => r.section_key === activeKey) ?? null;

  const progress = useMemo(
    () => computeReviewProgress(sections.map((s) => s.key), reviews),
    [sections, reviews]
  );

  const canCertify = CERTIFIER_ROLES.has(reviewerRole);
  const certifyEnabled = canCertify && progress.allRequiredApproved && !certified;

  // Warn if runtime_enabled is set — certifying may make the procedure live after restart
  const runtimeEnabledWarning =
    procedureState.runtime_enabled && !certified
      ? "Runtime is enabled. Certifying this procedure may make it live in BroBot after the next CasePrep server restart."
      : null;

  const handleReviewed = useCallback(
    (review: CasePrepSectionReview) => {
      setReviews((prev) => {
        const idx = prev.findIndex((r) => r.section_key === review.section_key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = review;
          return next;
        }
        return [...prev, review];
      });
      if (review.status === "approved" || review.status === "needs_improvement") {
        setActiveKey((currentKey) => {
          const currentIdx = sections.findIndex((s) => s.key === currentKey);
          const next = sections[currentIdx + 1];
          return next ? next.key : currentKey;
        });
      }
    },
    [sections]
  );

  const handleSectionSaved = useCallback(
    (updated: ClinicalSection, newCoverageScore: number, newWarnings: ValidationWarning[]) => {
      setSections((prev) =>
        prev.map((s) => (s.key === updated.key ? updated : s))
      );
      setCoverageScore(newCoverageScore);
      setValidationWarnings(newWarnings);
    },
    []
  );

  // Toast shown after a successful move-bullet operation.
  const [moveToast, setMoveToast] = useState<string | null>(null);

  const handleMoveBullet = useCallback(
    async (fromSectionKey: string, toSectionKey: string, bulletText: string) => {
      const res = await fetch(
        `/api/admin/caseprep-review/procedures/${encodeURIComponent(procedure.slug)}/move-bullet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromSectionKey, toSectionKey, bulletText }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Move failed");
      }
      // Update both affected sections from the server response.
      const { fromSection, toSection, coverage_score, validation_warnings } = json as {
        fromSection: ClinicalSection;
        toSection: ClinicalSection;
        coverage_score: number;
        validation_warnings: ValidationWarning[];
      };
      setSections((prev) =>
        prev.map((s) =>
          s.key === fromSection.key
            ? fromSection
            : s.key === toSection.key
            ? toSection
            : s
        )
      );
      setCoverageScore(coverage_score);
      setValidationWarnings(validation_warnings);
      const destLabel = SECTION_LABEL_OVERRIDES[toSectionKey] ?? toSectionKey;
      setMoveToast(`Moved bullet to ${destLabel}. Refresh if something looks off.`);
      setTimeout(() => setMoveToast(null), 5000);
    },
    [procedure.slug]
  );

  const handleCertify = async () => {
    setCertifying(true);
    setCertifyError(null);
    setCertifyWarning(null);
    try {
      const res = await fetch(
        `/api/admin/caseprep-review/procedures/${encodeURIComponent(procedure.slug)}/certify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Certification failed");
      }
      // Update procedure state from response so reviewer/certified_at/badges reflect new values
      const { _warning, ...updatedProcedure } = json as ProcedureDetail & {
        _warning?: string;
      };
      setProcedureState(updatedProcedure);
      if (_warning) {
        setCertifyWarning(_warning);
      }
    } catch (err) {
      setCertifyError(err instanceof Error ? err.message : "Certification failed");
    } finally {
      setCertifying(false);
    }
  };

  const coveragePct = coverageScore;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Procedure header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{procedureState.display_name}</h1>
            <div className="mt-1 text-sm text-gray-500">
              {procedureState.specialty}
              {procedureState.body_region ? ` · ${procedureState.body_region}` : ""}
              {procedureState.procedure_family ? ` · ${procedureState.procedure_family}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            <CasePrepStatusBadge
              value={procedureState.content_status}
              variant="content_status"
            />
            <CasePrepStatusBadge value={procedureState.review_status} variant="review_status" />
            {procedureState.is_live && (
              <CasePrepStatusBadge value="Live in BroBot" variant="live" />
            )}
          </div>
        </div>

        {/* Review progress + certify button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Review Progress —{" "}
                <span className="font-semibold text-gray-800">
                  {progress.approvedCount} / {progress.requiredTotal} required sections approved
                </span>
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress.allRequiredApproved
                    ? "bg-green-500"
                    : progress.approvedCount > 0
                    ? "bg-indigo-400"
                    : "bg-gray-300"
                }`}
                style={{
                  width: `${
                    progress.requiredTotal > 0
                      ? Math.round((progress.approvedCount / progress.requiredTotal) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {canCertify && (
            <div className="shrink-0">
              <button
                onClick={handleCertify}
                disabled={!certifyEnabled || certifying}
                title={
                  !progress.allRequiredApproved
                    ? "Approve all required sections before certifying"
                    : certified
                    ? "Already certified"
                    : "Certify this procedure"
                }
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  certifyEnabled
                    ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                    : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                }`}
              >
                {certifying ? "Certifying…" : certified ? "✓ Certified" : "Certify Procedure"}
              </button>
            </div>
          )}
        </div>

        {/* Runtime-enabled pre-cert warning */}
        {runtimeEnabledWarning && (
          <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            ⚠ {runtimeEnabledWarning}
          </div>
        )}

        {certifyError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {certifyError}
          </div>
        )}

        {/* Post-certify runtime warning */}
        {certifyWarning && (
          <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            ⚠ {certifyWarning}
          </div>
        )}

        {/* Content coverage bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Content Coverage</span>
            <span className="font-semibold text-gray-800">{coveragePct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                coveragePct >= 80
                  ? "bg-green-500"
                  : coveragePct >= 40
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>

        {/* Meta row — reads from procedureState so post-cert values appear immediately */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {procedureState.reviewer && (
            <span>
              Reviewer: <span className="text-gray-700">{procedureState.reviewer}</span>
            </span>
          )}
          {procedureState.last_reviewed_at && (
            <span>
              Last reviewed:{" "}
              <span className="text-gray-700">
                {new Date(procedureState.last_reviewed_at).toLocaleDateString()}
              </span>
            </span>
          )}
          {procedureState.certified_at && (
            <span>
              Certified:{" "}
              <span className="text-green-700">
                {new Date(procedureState.certified_at).toLocaleDateString()}
              </span>
            </span>
          )}
          {procedureState.deprecated && (
            <span className="text-red-600 font-semibold">DEPRECATED</span>
          )}
          {procedureState.replacement_slug && (
            <span>
              Replaced by:{" "}
              <span className="text-gray-700">{procedureState.replacement_slug}</span>
            </span>
          )}
          {reviewerName && (
            <span>
              Reviewing as: <span className="text-gray-700">{reviewerName}</span>
            </span>
          )}
        </div>

        {procedureState.review_notes_excerpt && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-900 italic">
            {procedureState.review_notes_excerpt}
          </div>
        )}
      </div>

      {/* Validation warnings */}
      <CasePrepWarningPanel warnings={validationWarnings} />

      {/* Section navigation + content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="overflow-x-auto border-b border-gray-200">
          <nav className="flex min-w-max">
            {sections.map((s) => {
              const label = SECTION_LABEL_OVERRIDES[s.key] ?? s.label;
              const isActive = s.key === activeKey;
              const reviewStatus = reviewMap.get(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => safeSetActiveKey(s.key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {label}
                  {sectionTabDot(s, reviewStatus)}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section content */}
        <div className="p-6">
          {activeSection ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {SECTION_LABEL_OVERRIDES[activeSection.key] ?? activeSection.label}
                </h2>
                <div className="flex items-center gap-2">
                  {activeSection.is_required && (
                    <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                  {(() => {
                    const idx = sections.findIndex((s) => s.key === activeKey);
                    const next = sections[idx + 1];
                    return next ? (
                      <button
                        onClick={() => safeSetActiveKey(next.key)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        Next →
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
              <CasePrepSectionRenderer
                key={activeSection.key}
                section={activeSection}
                procedureSlug={procedure.slug}
                review={activeReview}
                reviewerRole={reviewerRole}
                allSections={sections}
                onReviewed={handleReviewed}
                onSectionSaved={handleSectionSaved}
                onDirtyChange={setIsDirty}
                onMoveBullet={handleMoveBullet}
              />
            </>
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">
              No sections available.
            </div>
          )}
        </div>
      </div>

      {/* Move-bullet toast */}
      {moveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg z-50 pointer-events-none">
          {moveToast}
        </div>
      )}
    </div>
  );
}
