"use client";

import { Square, CheckSquare } from "lucide-react";

import {
  parseSections,
  type SignoutLine,
  type SignoutSection,
  type SignoutToken,
} from "@/lib/workspace/signout/tokens";

type Props = {
  text: string;
  onToggleCheckbox: (lineIndex: number) => void;
  onRequestEdit: () => void;
};

// Weight-bearing chip colors: restricted (red), partial (amber), permissive (green).
function wbClass(value: string): string {
  const v = value.toUpperCase();
  if (v === "NWB" || v === "TTWB") return "bg-red-50 text-red-800";
  if (v === "PWB") return "bg-amber-50 text-amber-800";
  return "bg-emerald-50 text-emerald-800"; // WBAT, FWB
}

function Token({ token }: { token: SignoutToken }) {
  if (token.type === "wb")
    return (
      <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${wbClass(token.value)}`}>
        {token.value}
      </span>
    );
  if (token.type === "pod")
    return (
      <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800">
        {token.value}
      </span>
    );
  if (token.type === "tag")
    return (
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
        {token.value}
      </span>
    );
  return <span>{token.value}</span>;
}

function Line({
  line,
  onToggle,
}: {
  line: SignoutLine;
  onToggle: (index: number) => void;
}) {
  const isEmpty = line.tokens.length === 0 && line.checkbox === "none";
  if (isEmpty) return <div className="h-2" />;

  const checked = line.checkbox === "checked";
  const content = (
    <span className={checked ? "text-slate-400 line-through" : ""}>
      {line.tokens.map((token, i) => (
        <Token key={i} token={token} />
      ))}
    </span>
  );

  if (line.checkbox === "none") return <div className="leading-relaxed">{content}</div>;

  return (
    <div className="flex items-start gap-1.5 leading-relaxed">
      <button
        type="button"
        aria-label={checked ? "Mark action incomplete" : "Mark action done"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(line.index);
        }}
        className={`mt-0.5 shrink-0 ${checked ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"}`}
      >
        {checked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <span>{content}</span>
    </div>
  );
}

function Section({
  section,
  onToggleCheckbox,
}: {
  section: SignoutSection;
  onToggleCheckbox: (index: number) => void;
}) {
  const isPlan = /plan|to-?do/i.test(section.title);
  return (
    <div className={`mt-1.5 border-t pt-1.5 ${isPlan ? "border-slate-200" : "border-slate-100"}`}>
      <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {section.title}
      </div>
      {section.lines.map((line) => (
        <Line key={line.index} line={line} onToggle={onToggleCheckbox} />
      ))}
    </div>
  );
}

export function SmartBody({ text, onToggleCheckbox, onRequestEdit }: Props) {
  const { lead, sections } = parseSections(text);
  const empty = text.trim().length === 0;

  return (
    <div
      onClick={onRequestEdit}
      className="mt-2 min-h-[2rem] cursor-text rounded-lg border border-transparent px-1 py-1 text-sm text-slate-800 hover:border-slate-200"
    >
      {empty ? (
        <span className="text-slate-400">Add sign-out… tap to edit</span>
      ) : (
        <>
          {lead.map((line) => (
            <Line key={line.index} line={line} onToggle={onToggleCheckbox} />
          ))}
          {sections.map((section) => (
            <Section
              key={section.headerIndex}
              section={section}
              onToggleCheckbox={onToggleCheckbox}
            />
          ))}
        </>
      )}
    </div>
  );
}
