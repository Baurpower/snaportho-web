"use client";

import { useState } from "react";

import type { PacketItem } from "@/lib/caseprep-v1-1/stream-schema";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  hard: "border-rose-200 bg-rose-50 text-rose-800",
};

/** Staged reveal: question → answer. */
export function PimpQuestionCard({
  item,
  index,
  forceAnswerShown = false,
  showTeachingDetails = false,
}: {
  item: PacketItem;
  index: number;
  forceAnswerShown?: boolean;
  showTeachingDetails?: boolean;
}) {
  const [answerShown, setAnswerShown] = useState(false);
  const visible = forceAnswerShown || answerShown;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold leading-6 text-slate-950">
          <span className="mr-2 text-emerald-700">{index + 1}.</span>
          {item.question}
        </p>
        {item.difficulty ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
              DIFFICULTY_STYLES[item.difficulty] ?? DIFFICULTY_STYLES.medium
            }`}
          >
            {item.difficulty}
          </span>
        ) : null}
      </div>

      {!visible ? (
        <button
          type="button"
          onClick={() => setAnswerShown(true)}
          className="mt-3 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
        >
          Reveal answer
        </button>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold leading-6 text-slate-900">{item.answer}</p>
          {showTeachingDetails &&
          (item.why_attendings_ask || item.common_mistake || item.teaching_pearl) ? (
            <dl className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs leading-5">
              {item.why_attendings_ask ? (
                <div>
                  <dt className="font-bold text-slate-900">Why attendings ask</dt>
                  <dd className="text-slate-600">{item.why_attendings_ask}</dd>
                </div>
              ) : null}
              {item.common_mistake ? (
                <div>
                  <dt className="font-bold text-rose-800">Common mistake</dt>
                  <dd className="text-slate-600">{item.common_mistake}</dd>
                </div>
              ) : null}
              {item.teaching_pearl ? (
                <div>
                  <dt className="font-bold text-emerald-800">Teaching pearl</dt>
                  <dd className="text-slate-600">{item.teaching_pearl}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      )}
    </div>
  );
}
