"use client";

import { useState } from "react";
import type { ProcedureDetail } from "@/lib/caseprep-review/types";
import { CasePrepStatusBadge } from "./CasePrepStatusBadge";
import { CasePrepWarningPanel } from "./CasePrepWarningPanel";
import { CasePrepSectionRenderer } from "./CasePrepSectionRenderer";

interface CasePrepProcedureDetailProps {
  procedure: ProcedureDetail;
}

const SECTION_ORDER = [
  "setup_positioning",
  "approach_landmarks",
  "surgical_layers",
  "structures_at_risk",
  "implant_strategy",
  "reduction_fluoro",
  "pitfalls",
  "attending_pimp_questions",
  "postop_night_before",
  "sources",
];

const SECTION_LABEL_OVERRIDES: Record<string, string> = {
  setup_positioning: "Setup & Positioning",
  approach_landmarks: "Approach & Landmarks",
  surgical_layers: "Surgical Layers",
  structures_at_risk: "Structures at Risk",
  implant_strategy: "Implant Strategy",
  reduction_fluoro: "Reduction / Fluoro",
  pitfalls: "Pitfalls",
  attending_pimp_questions: "Attending Pimp Questions",
  postop_night_before: "Post-op / Night Before",
  sources: "Sources",
};

export function CasePrepProcedureDetail({ procedure }: CasePrepProcedureDetailProps) {
  const sorted = [...procedure.sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.key);
    const bi = SECTION_ORDER.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const [activeKey, setActiveKey] = useState(sorted[0]?.key ?? "");
  const activeSection = sorted.find((s) => s.key === activeKey) ?? sorted[0];

  const coveragePct = Math.round((procedure.coverage_score ?? 0) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{procedure.display_name}</h1>
            <div className="mt-1 text-sm text-gray-500">
              {procedure.specialty}
              {procedure.body_region ? ` · ${procedure.body_region}` : ""}
              {procedure.procedure_family ? ` · ${procedure.procedure_family}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            <CasePrepStatusBadge value={procedure.content_status} variant="content_status" />
            <CasePrepStatusBadge value={procedure.review_status} variant="review_status" />
            {procedure.is_live && (
              <CasePrepStatusBadge value="Live in BroBot" variant="live" />
            )}
          </div>
        </div>

        {/* Coverage bar */}
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

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {procedure.reviewer && (
            <span>Reviewer: <span className="text-gray-700">{procedure.reviewer}</span></span>
          )}
          {procedure.last_reviewed_at && (
            <span>
              Last reviewed:{" "}
              <span className="text-gray-700">
                {new Date(procedure.last_reviewed_at).toLocaleDateString()}
              </span>
            </span>
          )}
          {procedure.certified_at && (
            <span>
              Certified:{" "}
              <span className="text-green-700">
                {new Date(procedure.certified_at).toLocaleDateString()}
              </span>
            </span>
          )}
          {procedure.deprecated && (
            <span className="text-red-600 font-semibold">DEPRECATED</span>
          )}
          {procedure.replacement_slug && (
            <span>Replaced by: <span className="text-gray-700">{procedure.replacement_slug}</span></span>
          )}
        </div>

        {procedure.review_notes_excerpt && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-900 italic">
            {procedure.review_notes_excerpt}
          </div>
        )}
      </div>

      {/* Validation warnings */}
      <CasePrepWarningPanel warnings={procedure.validation_warnings} />

      {/* Section navigation + content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="overflow-x-auto border-b border-gray-200">
          <nav className="flex min-w-max">
            {sorted.map((s) => {
              const label = SECTION_LABEL_OVERRIDES[s.key] ?? s.label;
              const isActive = s.key === activeKey;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveKey(s.key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  } ${s.is_empty ? "opacity-60" : ""}`}
                >
                  {label}
                  {s.is_empty && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
                  )}
                  {!s.is_empty && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section content */}
        <div className="p-6">
          {activeSection ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {SECTION_LABEL_OVERRIDES[activeSection.key] ?? activeSection.label}
                </h2>
                {activeSection.is_required && (
                  <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                )}
              </div>
              <CasePrepSectionRenderer section={activeSection} />
            </>
          ) : (
            <div className="text-gray-400 text-sm text-center py-12">No sections available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
