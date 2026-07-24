"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { buildCaseReadinessHref } from "@/components/student-workspace/prepare/prepare-routes";
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

const TIME_OPTIONS = ["5m", "15m", "45m", "90m"] as const;

/**
 * Phone version of the case prep launcher.
 *
 * The desktop card lays search, mode, time, rotation, quick picks, results and
 * a full topic detail panel out at once. On a phone that buries the search box
 * under its own controls, so here: search first, the three settings collapse
 * behind a single "Options" row, and the launch button is pinned to the bottom
 * of the card rather than after a long detail panel.
 */
export function MobileCasePrepLauncher({
  topicValue,
  onTopicChange,
  onTopicSelect,
  onTopicPick,
  searchResults,
  hasSearched,
  selectedTopic,
  relatedTopics,
  rotationQuickPicks,
  context,
  rotationOptions,
  onChange,
  selectedMinutes,
}: {
  topicValue: string;
  onTopicChange: (value: string) => void;
  onTopicSelect: (result: CurriculumSearchResult) => void;
  onTopicPick: (topic: CurriculumTopic) => void;
  searchResults: CurriculumSearchResult[];
  hasSearched: boolean;
  selectedTopic?: CurriculumTopic;
  relatedTopics: CurriculumTopic[];
  rotationQuickPicks: CurriculumTopic[];
  context: PrepareContextState;
  rotationOptions: Array<{ value: string; label: string }>;
  onChange: (next: PrepareContextState) => void;
  selectedMinutes: number;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const activeMode = context.studyMode ?? "fast";
  const primaryLabel =
    activeMode === "deep" ? "Start deep study" : "Start fast prep";
  const readinessHref = selectedTopic
    ? buildCaseReadinessHref({
        topicId: selectedTopic.id,
        mode: activeMode,
        time: selectedMinutes,
      })
    : null;
  const rotationLabel =
    rotationOptions.find((option) => option.value === context.rotationId)
      ?.label ?? "General Orthopaedics";

  return (
    // min-w-0: keeps the nowrap quick-pick scroller from stretching this grid item
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Case prep
      </p>
      <h2 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-950">
        Prepare for your next case
      </h2>

      <div className="mt-3 flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5">
        <Search className="h-4.5 w-4.5 shrink-0 text-slate-400" />
        <input
          value={topicValue}
          onChange={(event) => onTopicChange(event.target.value)}
          placeholder="Distal radius, ACL tear, ankle ORIF…"
          enterKeyHint="search"
          autoComplete="off"
          className="w-full bg-transparent py-3 text-[16px] font-semibold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400"
        />
        {topicValue ? (
          <button
            type="button"
            onClick={() => onTopicChange("")}
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 active:bg-slate-200"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setOptionsOpen((current) => !current)}
        aria-expanded={optionsOpen}
        className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-[13px] font-semibold text-slate-700">
            {activeMode === "deep" ? "Deep study" : "Fast prep"} ·{" "}
            {context.timeAvailable} · {rotationLabel}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            optionsOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {optionsOpen ? (
        <div className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Mode
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
              {MODE_OPTIONS.map((option) => {
                const active = activeMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChange({ ...context, studyMode: option.id })}
                    aria-pressed={active}
                    className={`min-h-10 rounded-lg text-[14px] font-semibold transition ${
                      active
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Time available
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {TIME_OPTIONS.map((time) => {
                const active = context.timeAvailable === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...context,
                        timeAvailable:
                          time as PrepareContextState["timeAvailable"],
                      })
                    }
                    aria-pressed={active}
                    className={`min-h-11 rounded-xl text-[14px] font-semibold transition ${
                      active
                        ? "bg-sky-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="mobile-prep-rotation"
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Rotation
            </label>
            <select
              id="mobile-prep-rotation"
              value={context.rotationId ?? ""}
              onChange={(event) =>
                onChange({ ...context, rotationId: event.target.value || null })
              }
              className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none focus:border-sky-300"
            >
              <option value="">General Orthopaedics</option>
              {rotationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {rotationQuickPicks.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Quick picks for your rotation
          </p>
          <div className="-mx-4 mt-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2">
              {rotationQuickPicks.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onTopicPick(topic)}
                  className="min-h-10 shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition active:bg-sky-50"
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {searchResults.length > 0 ? (
        <div className="mt-3 space-y-2">
          {searchResults.map((result) => {
            const active = selectedTopic?.id === result.topic.id;
            return (
              <button
                key={result.topic.id}
                type="button"
                onClick={() => onTopicSelect(result)}
                className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-sky-400 bg-sky-50"
                    : "border-slate-200 bg-white active:bg-slate-50"
                }`}
              >
                <p className="text-[15px] font-bold leading-snug tracking-tight text-slate-950">
                  {result.topic.title}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-600">
                  {result.track.title} · {result.topic.subspecialty}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {hasSearched && searchResults.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-4 text-[13px] leading-6 text-slate-600">
          No exact match. Try a procedure, diagnosis, or common case — or browse
          by service below.
        </p>
      ) : null}

      {selectedTopic ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Selected topic
          </p>
          <h3 className="mt-0.5 text-[17px] font-black leading-tight tracking-tight text-slate-950">
            {selectedTopic.title}
          </h3>
          <p className="mt-0.5 text-[12px] text-slate-600">
            {selectedTopic.subspecialty} · Fast{" "}
            {selectedTopic.estimatedFastMinutes}m · Deep{" "}
            {selectedTopic.estimatedDeepMinutes}m
          </p>

          <button
            type="button"
            onClick={() => setDetailOpen((current) => !current)}
            aria-expanded={detailOpen}
            className="mt-2 flex min-h-10 w-full items-center justify-between gap-2 text-[13px] font-semibold text-slate-700"
          >
            {detailOpen ? "Hide details" : "What's covered"}
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition ${
                detailOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {detailOpen ? (
            <div className="mt-1 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Learning objectives
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {selectedTopic.learningObjectives.length > 0 ? (
                    selectedTopic.learningObjectives
                      .slice(0, 5)
                      .map((objective) => (
                        <li
                          key={objective.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700"
                        >
                          {objective.objective}
                        </li>
                      ))
                  ) : (
                    <li className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-500">
                      Learning objectives are not available for this topic yet.
                    </li>
                  )}
                </ul>
              </div>

              {selectedTopic.commonCases.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Common cases
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedTopic.commonCases.map((curriculumCase) => (
                      <span
                        key={curriculumCase.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700"
                      >
                        {curriculumCase.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {relatedTopics.length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Related topics
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {relatedTopics.slice(0, 5).map((topic) => (
                      <Link
                        key={topic.id}
                        href={buildCaseReadinessHref({
                          topicId: topic.id,
                          mode: activeMode,
                          time: selectedMinutes,
                        })}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700"
                      >
                        {topic.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {readinessHref ? (
        <Link
          href={readinessHref}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800"
        >
          {primaryLabel}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-3 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-[15px] font-semibold text-slate-400"
        >
          {primaryLabel}
        </button>
      )}
    </section>
  );
}
