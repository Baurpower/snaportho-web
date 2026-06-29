"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import type {
  CurriculumSearchResult,
  CurriculumTopic,
  StudyMode,
} from "@/lib/student-curriculum";
import type { PrepareContextState } from "@/components/student-workspace/prepare/types";

const MODE_OPTIONS: Array<{ id: StudyMode; label: string }> = [
  { id: "fast", label: "Fast prep" },
  { id: "deep", label: "Deep study" },
];

export function CasePrepLauncher({
  topicValue,
  onTopicChange,
  onTopicSelect,
  searchResults,
  hasSearched,
  selectedTopic,
  relatedTopics,
  context,
  rotationOptions,
  onChange,
  selectedMinutes,
}: {
  topicValue: string;
  onTopicChange: (value: string) => void;
  onTopicSelect: (result: CurriculumSearchResult) => void;
  searchResults: CurriculumSearchResult[];
  hasSearched: boolean;
  selectedTopic?: CurriculumTopic;
  relatedTopics: CurriculumTopic[];
  context: PrepareContextState;
  rotationOptions: Array<{ value: string; label: string }>;
  onChange: (next: PrepareContextState) => void;
  selectedMinutes: number;
}) {
  const activeMode = context.studyMode ?? "fast";
  const primaryLabel =
    activeMode === "deep" ? "Start Deep Study" : "Start Fast Prep";
  const readinessHref = selectedTopic
    ? `/student-workspace/case-readiness/${selectedTopic.id}?mode=${activeMode}&time=${selectedMinutes}`
    : null;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Case Prep
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        Prepare for your next ortho case
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Search the student curriculum by diagnosis, procedure, or common case.
      </p>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Search a case or topic
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={topicValue}
            onChange={(event) => onTopicChange(event.target.value)}
            placeholder="Distal radius fracture, ACL tear, ankle ORIF, compartment syndrome..."
            className="w-full bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CompactField label="Mode">
            <div className="flex flex-wrap gap-2">
              {MODE_OPTIONS.map((mode) => {
                const active = activeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...context,
                        studyMode: mode.id,
                      })
                    }
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </CompactField>

          <CompactField label="Time">
            <div className="flex flex-wrap gap-2">
              {["5m", "15m", "45m", "90m"].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...context,
                      timeAvailable: time as PrepareContextState["timeAvailable"],
                    })
                  }
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    context.timeAvailable === time
                      ? "bg-sky-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </CompactField>

          <CompactField label="Rotation">
            <select
              value={context.rotationId ?? ""}
              onChange={(event) =>
                onChange({
                  ...context,
                  rotationId: event.target.value || null,
                })
              }
              className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-sky-300"
            >
              <option value="">General Orthopaedics</option>
              {rotationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </CompactField>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {searchResults.map((result) => (
          <button
            key={result.topic.id}
            type="button"
            onClick={() => onTopicSelect(result)}
            className="rounded-[1.25rem] border border-slate-200 bg-white p-4 text-left transition hover:border-sky-300 hover:bg-sky-50"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-black tracking-tight text-slate-950">
                  {result.topic.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {result.track.title} · {result.topic.subspecialty}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {result.reasonLabel}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.topic.commonCases.slice(0, 2).map((curriculumCase) => (
                <span
                  key={curriculumCase.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {curriculumCase.name}
                </span>
              ))}
            </div>
          </button>
        ))}

        {hasSearched && searchResults.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
            No exact match. Try a procedure, diagnosis, or common case.
          </div>
        ) : null}
      </div>

      {selectedTopic ? (
        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Selected topic
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {selectedTopic.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {selectedTopic.subspecialty}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                Fast {selectedTopic.estimatedFastMinutes}m
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                Deep {selectedTopic.estimatedDeepMinutes}m
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Learning objectives
              </p>
              <div className="mt-2 space-y-2">
                {selectedTopic.learningObjectives.slice(0, 5).map((objective) => (
                  <div
                    key={objective.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {objective.objective}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Common cases
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTopic.commonCases.map((curriculumCase) => (
                    <span
                      key={curriculumCase.id}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
                    >
                      {curriculumCase.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Related topics
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {relatedTopics.length > 0 ? (
                    relatedTopics.slice(0, 5).map((topic) => (
                      <span
                        key={topic.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
                      >
                        {topic.title}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      Related topics will appear here when available.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {selectedTopic
            ? `Ready to study ${selectedTopic.title}?`
            : "Select a topic to launch a structured case-readiness session."}
        </p>
        {readinessHref ? (
          <Link
            href={readinessHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {primaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400"
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
