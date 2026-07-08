"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SurvivalSection } from "@/lib/student-curriculum";

function LearnNextSection({ section }: { section: SurvivalSection }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-black tracking-tight text-slate-950">{section.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{section.subtitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {section.items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

type SurvivalSectionCardProps = {
  section: SurvivalSection;
  defaultExpanded?: boolean;
};

function SurvivalSectionCard({ section, defaultExpanded = false }: SurvivalSectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-950">{section.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{section.subtitle}</p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 px-4 py-4">
          {section.id === "attendingQuestions" ? (
            <ol className="space-y-2">
              {section.items.map((item, i) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : section.id === "commonMistakes" ? (
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : section.id === "mustKnow" ? (
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold leading-6 text-slate-900">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SurvivalSectionsPanel({ sections }: { sections: SurvivalSection[] }) {
  const survivalSections = sections.filter((s) => s.group === "survival" && s.hasContent);
  const procedureSections = sections.filter((s) => s.group === "procedure-detail" && s.hasContent);

  if (survivalSections.length === 0 && procedureSections.length === 0) {
    return null;
  }

  const learnNextSection = survivalSections.find((s) => s.id === "learnNext");
  const coreSurvival = survivalSections.filter((s) => s.id !== "learnNext");

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Survival Guide
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        What you need to know before tomorrow
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Work through these in order. The first two sections are the highest yield.
      </p>

      <div className="mt-5 grid gap-3">
        {coreSurvival.map((section, index) => (
          <SurvivalSectionCard
            key={section.id}
            section={section}
            defaultExpanded={index < 2}
          />
        ))}
      </div>

      {learnNextSection && learnNextSection.items.length > 0 ? (
        <div className="mt-3">
          <LearnNextSection section={learnNextSection} />
        </div>
      ) : null}

      {procedureSections.length > 0 ? (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Procedure Details
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Review after mastering the survival sections above.
          </p>
          <div className="grid gap-3">
            {procedureSections.map((section) => (
              <SurvivalSectionCard key={section.id} section={section} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
