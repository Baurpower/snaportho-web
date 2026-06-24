"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type {
  ClinicalSection,
  ClinicalSectionItem,
  CasePrepSectionReview,
  ValidationWarning,
} from "@/lib/caseprep-review/types";
import { CasePrepSectionEditor } from "./CasePrepSectionEditor";
import { CasePrepSectionReviewControls } from "./CasePrepSectionReviewControls";
import { EDITOR_ROLES, BULLET_SECTIONS } from "@/lib/caseprep-review/constants";
import type { CasePrepReviewerRole } from "@/lib/caseprep-review/types";
import { SECTION_LABEL_OVERRIDES } from "./CasePrepProcedureDetail";

interface CasePrepSectionRendererProps {
  section: ClinicalSection;
  procedureSlug: string;
  review: CasePrepSectionReview | null;
  reviewerRole: CasePrepReviewerRole;
  allSections: ClinicalSection[];
  onReviewed: (review: CasePrepSectionReview) => void;
  onSectionSaved: (updated: ClinicalSection, coverageScore: number, warnings: ValidationWarning[]) => void;
  onDirtyChange: (dirty: boolean) => void;
  onMoveBullet: (fromKey: string, toKey: string, bulletText: string) => Promise<void>;
}

// ── BulletItem with Move UX ───────────────────────────────────────────────────

// Popover height estimate used for viewport collision detection.
const POPOVER_HEIGHT = 280;
const POPOVER_WIDTH = 288; // w-72

function BulletItem({
  text,
  sectionLabel,
  moveSections,
  moving,
  onMove,
}: {
  text: string;
  sectionLabel: string;
  moveSections: Array<{ key: string; label: string }>;
  moving: boolean;
  onMove: (toKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canMove = moveSections.length > 0;

  const openPopover = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Vertical: open upward if not enough space below.
    const spaceBelow = vh - rect.bottom;
    const openUp = spaceBelow < POPOVER_HEIGHT + 12;

    // Horizontal: align to right edge of button, clamp so it doesn't go off-screen left.
    const rightEdge = vw - rect.right;
    const leftPos = Math.max(8, rect.right - POPOVER_WIDTH);

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
      width: Math.min(POPOVER_WIDTH, vw - 16),
      left: leftPos,
      ...(openUp
        ? { bottom: vh - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    };
    void rightEdge; // used via leftPos calc above
    setPopoverStyle(style);
    setOpen(true);
  }, []);

  // Close on Escape key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-gray-100 last:border-0">
      {/* Bullet + text */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span className="text-gray-800 text-sm leading-relaxed">{text}</span>
      </div>

      {/* Move button — always visible when canMove */}
      {canMove && (
        <div className="shrink-0 self-start sm:self-start ml-3.5 sm:ml-0">
          <button
            ref={buttonRef}
            aria-label="Move this bullet to another section"
            onClick={openPopover}
            disabled={moving}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              moving
                ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
                : "text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300"
            }`}
          >
            {moving ? (
              "Moving…"
            ) : (
              <>
                <span aria-hidden>↪</span> Move
              </>
            )}
          </button>

          {open && !moving && typeof document !== "undefined" &&
            createPortal(
              <>
                {/* Click-away */}
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setOpen(false)}
                />

                <div
                  style={popoverStyle}
                  className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Move this bullet to:</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      From: <span className="font-medium text-gray-700">{sectionLabel}</span>
                    </p>
                  </div>

                  {/* Destination options */}
                  <div
                    className="py-1 overflow-y-auto"
                    style={{ maxHeight: "calc(min(320px, 100vh - 120px))" }}
                  >
                    {moveSections.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => {
                          setOpen(false);
                          onMove(s.key);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Footer hint */}
                  <div className="px-4 py-2.5 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Removes it from the current section and appends it to the selected one.
                    </p>
                  </div>
                </div>
              </>,
              document.body
            )
          }
        </div>
      )}
    </li>
  );
}

// ── Other read-only item renderers ────────────────────────────────────────────

function StructureAtRiskCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "structure_at_risk" }>;
}) {
  return (
    <div className="border border-red-100 rounded-xl p-5 bg-red-50 space-y-3">
      <div className="font-semibold text-red-900 text-base">{item.structure}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
            Why at Risk
          </div>
          <div className="text-gray-800">{item.why_at_risk}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
            How to Avoid
          </div>
          <div className="text-gray-800">{item.how_to_avoid_injury}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            If Injured
          </div>
          <div className="text-gray-800">{item.consequence_of_injury}</div>
        </div>
      </div>
      {item.approach_context && (
        <div className="text-xs text-gray-500 italic">{item.approach_context}</div>
      )}
    </div>
  );
}

function SurgicalLayerCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "surgical_layer" }>;
}) {
  return (
    <div className="border border-blue-100 rounded-xl p-5 bg-blue-50 space-y-3">
      <div className="font-semibold text-blue-900 text-base">{item.layer_name}</div>
      <p className="text-sm text-gray-800 leading-relaxed">{item.what_user_should_know}</p>
      {item.key_structures.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            Key Structures
          </div>
          <div className="flex flex-wrap gap-1">
            {item.key_structures.map((s, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {item.structures_at_risk.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
            Structures at Risk
          </div>
          <div className="flex flex-wrap gap-1">
            {item.structures_at_risk.map((s, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full border border-red-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {item.surgical_relevance && (
        <div className="text-xs text-gray-600 italic">{item.surgical_relevance}</div>
      )}
    </div>
  );
}

function PimpQuestionCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "pimp_question" }>;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-2">Q</span>
        <span className="font-medium text-gray-900 text-sm">{item.question}</span>
      </div>
      <div className="px-5 py-3 bg-white">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mr-2">A</span>
        <span className="text-sm text-gray-800 leading-relaxed">{item.answer}</span>
      </div>
    </div>
  );
}

function SourceCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "source" }>;
}) {
  return (
    <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
      <div className="shrink-0">
        <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-medium uppercase">
          {item.source_type}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {item.title && (
          <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 hover:underline truncate block"
        >
          {item.url}
        </a>
      </div>
      {item.consumed && (
        <span className="shrink-0 text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
          Used
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SOURCE_SECTION_KEY = "sources";
const NON_EDITABLE_SECTIONS = new Set([SOURCE_SECTION_KEY]);

export function CasePrepSectionRenderer({
  section,
  procedureSlug,
  review,
  reviewerRole,
  allSections,
  onReviewed,
  onSectionSaved,
  onDirtyChange,
  onMoveBullet,
}: CasePrepSectionRendererProps) {
  const [editing, setEditing] = useState(false);
  const [localSection, setLocalSection] = useState<ClinicalSection>(section);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  // Key of the bullet currently being moved (to disable its button).
  const [movingBulletText, setMovingBulletText] = useState<string | null>(null);

  const canEdit =
    EDITOR_ROLES.has(reviewerRole) && !NON_EDITABLE_SECTIONS.has(section.key);

  const currentSectionLabel =
    SECTION_LABEL_OVERRIDES[section.key] ?? section.label;

  // Build move-target list: bullet-compatible sections except the current one.
  const moveSections = BULLET_SECTIONS.has(section.key)
    ? allSections
        .filter((s) => s.key !== section.key && BULLET_SECTIONS.has(s.key))
        .map((s) => ({ key: s.key, label: SECTION_LABEL_OVERRIDES[s.key] ?? s.label }))
    : [];

  const handleMoveClick = async (bulletText: string, toKey: string) => {
    setMovingBulletText(bulletText);
    setMoveError(null);
    try {
      await onMoveBullet(section.key, toKey, bulletText);
      // Optimistically remove the bullet from local view; parent updates the full section state.
      setLocalSection((prev) => ({
        ...prev,
        items: prev.items.filter(
          (item) => !(item.kind === "bullet" && item.text === bulletText)
        ),
      }));
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // Show a user-friendly message; never leak API internals.
      const isPartialFailure = raw.toLowerCase().includes("refresh");
      setMoveError(
        isPartialFailure
          ? "The bullet was removed from this section but couldn't be added to the destination. Please refresh."
          : "Could not move this bullet. Please refresh and try again."
      );
    } finally {
      setMovingBulletText(null);
    }
  };

  const startEditing = () => {
    setEditing(true);
    onDirtyChange(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    onDirtyChange(false);
  };

  const handleSave = async (items: ClinicalSectionItem[]) => {
    const res = await fetch(
      `/api/admin/caseprep-review/procedures/${encodeURIComponent(procedureSlug)}/sections/${encodeURIComponent(section.key)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Save failed");
    }
    setLocalSection(json.section);
    onSectionSaved(json.section, json.coverage_score, json.validation_warnings);
    setEditing(false);
    onDirtyChange(false);
    setSaveError(null);
  };

  if (editing) {
    return (
      <CasePrepSectionEditor
        section={localSection}
        onSave={handleSave}
        onCancel={cancelEditing}
      />
    );
  }

  const isEmpty = localSection.is_empty || localSection.items.length === 0;
  const isBulletList =
    localSection.items.length > 0 &&
    localSection.items.every((item) => item.kind === "bullet" || item.kind === "text");
  const showMoveButtons = !editing && moveSections.length > 0;

  return (
    <div className="space-y-4">
      {/* Meta + edit button row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">
            {localSection.items.length} item{localSection.items.length !== 1 ? "s" : ""}
          </div>
          {localSection.coverage_weight > 0 && (
            <div className="text-xs text-gray-400">
              Weight: {localSection.coverage_weight}
            </div>
          )}
        </div>
        {canEdit && (
          <button
            onClick={startEditing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            Edit Section
          </button>
        )}
      </div>

      {saveError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}

      {moveError && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {moveError}
        </div>
      )}

      {/* Section content */}
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <div className="text-gray-400 text-sm">Not drafted yet</div>
          {localSection.is_required && (
            <div className="mt-1 text-xs text-red-500">Required section</div>
          )}
        </div>
      ) : isBulletList ? (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {localSection.items.map((item, i) =>
            item.kind === "bullet" ? (
              <BulletItem
                key={i}
                text={item.text}
                sectionLabel={currentSectionLabel}
                moveSections={showMoveButtons ? moveSections : []}
                moving={movingBulletText === item.text}
                onMove={(toKey) => handleMoveClick(item.text, toKey)}
              />
            ) : item.kind === "text" ? (
              <li key={i} className="py-2 px-2">
                <p className="text-sm text-gray-800 leading-relaxed">{item.text}</p>
              </li>
            ) : null
          )}
        </ul>
      ) : (
        <div className="space-y-4">
          {localSection.items.map((item, i) => {
            switch (item.kind) {
              case "structure_at_risk":
                return <StructureAtRiskCard key={i} item={item} />;
              case "surgical_layer":
                return <SurgicalLayerCard key={i} item={item} />;
              case "pimp_question":
                return <PimpQuestionCard key={i} item={item} />;
              case "source":
                return <SourceCard key={i} item={item} />;
              default:
                return null;
            }
          })}
        </div>
      )}

      {/* Review controls — not shown for sources section */}
      {section.key !== SOURCE_SECTION_KEY && (
        <CasePrepSectionReviewControls
          sectionKey={section.key}
          procedureSlug={procedureSlug}
          review={review}
          onReviewed={onReviewed}
        />
      )}
    </div>
  );
}
