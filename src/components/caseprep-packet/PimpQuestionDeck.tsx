"use client";

import { useMemo, useState } from "react";

import type { PacketItem } from "@/lib/caseprep-v1-1/stream-schema";
import { PimpQuestionCard } from "./PimpQuestionCard";

type Difficulty = "all" | "easy" | "medium" | "hard";

export function PimpQuestionDeck({ items }: { items: PacketItem[] }) {
  const [mode, setMode] = useState<"drill" | "skim">("drill");
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [revealAll, setRevealAll] = useState(false);
  const visibleItems = useMemo(
    () =>
      difficulty === "all"
        ? items
        : items.filter((item) => item.difficulty === difficulty),
    [difficulty, items],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm">
      <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50/80 to-white px-5 py-4 sm:px-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">
          2 · Test yourself
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              Pimp Questions
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pocket Pimped and attending-focused questions for this case.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {visibleItems.length} question{visibleItems.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Question mode">
            {(["drill", "skim"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize ${
                  mode === value ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="pimp-difficulty">
            Filter by difficulty
          </label>
          <select
            id="pimp-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {mode === "drill" ? (
            <button
              type="button"
              onClick={() => setRevealAll((current) => !current)}
              className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100"
            >
              {revealAll ? "Hide all answers" : "Reveal all answers"}
            </button>
          ) : null}
        </div>

        {visibleItems.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleItems.map((item, index) => (
              <PimpQuestionCard
                key={item.id}
                item={item}
                index={index}
                forceAnswerShown={mode === "skim" || revealAll}
                showTeachingDetails={mode === "skim"}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            No questions match this difficulty filter.
          </p>
        )}
      </div>
    </section>
  );
}
