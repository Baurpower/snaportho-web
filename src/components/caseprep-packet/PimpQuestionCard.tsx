"use client";

import { useState } from "react";

import type { PacketItem } from "@/lib/caseprep-v1-1/stream-schema";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  hard: "border-rose-200 bg-rose-50 text-rose-800",
};

/**
 * Staged reveal: question → answer → pearl/explanation. State is local so a
 * reveal never re-renders the rest of the packet.
 */
export function PimpQuestionCard({ item, index }: { item: PacketItem; index: number }) {
  const [answerShown, setAnswerShown] = useState(false);
  const [detailShown, setDetailShown] = useState(false);
  const hasDetail = Boolean(
    item.teaching_pearl || item.why_attendings_ask || item.common_mistake || item.supporting_detail
  );

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

      {!answerShown ? (
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

          {hasDetail && !detailShown ? (
            <button
              type="button"
              onClick={() => setDetailShown(true)}
              className="mt-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
            >
              Pearl &amp; why it&apos;s asked
            </button>
          ) : null}

          {detailShown ? (
            <dl className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm leading-6">
              {item.teaching_pearl ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Teaching pearl
                  </dt>
                  <dd className="text-slate-800">{item.teaching_pearl}</dd>
                </div>
              ) : null}
              {item.why_attendings_ask ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                    Why attendings ask this
                  </dt>
                  <dd className="text-slate-800">{item.why_attendings_ask}</dd>
                </div>
              ) : null}
              {item.common_mistake ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Common mistake
                  </dt>
                  <dd className="text-slate-800">{item.common_mistake}</dd>
                </div>
              ) : null}
              {!item.teaching_pearl && item.supporting_detail ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Note
                  </dt>
                  <dd className="text-slate-800">{item.supporting_detail}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      )}
    </div>
  );
}
