"use client";

import { Fragment } from "react";
import {
  buildHandoffDocument,
  formatHandoffTimestamp,
  type HandoffDocument,
  type HandoffRow,
} from "@/lib/workspace/signout/handoff";
import type { SignoutCard } from "@/lib/workspace/signout/types";

type Props = {
  serviceName: string;
  cards: SignoutCard[];
  /** Injected for tests / freeze time; defaults to now when printing. */
  generatedAt?: Date;
};

/**
 * Print-only multi-column handoff sheet for ortho rounds.
 * Location-grouped, active census, full cell text (no truncate).
 */
export function HandoffSheet({ serviceName, cards, generatedAt }: Props) {
  const doc = buildHandoffDocument({
    serviceName,
    cards,
    generatedAt: generatedAt ?? new Date(),
    mode: "rounds",
    activeOnly: true,
  });

  return (
    <div id="signout-handoff-sheet" className="hidden print:block">
      <HandoffDocumentView doc={doc} />
    </div>
  );
}

export function HandoffDocumentView({ doc }: { doc: HandoffDocument }) {
  const { meta, groups, actionRollup } = doc;
  const { counts } = meta;

  return (
    <div className="text-[9.5pt] leading-snug text-black">
      <header className="mb-2 border-b-2 border-black pb-1.5">
        <h1 className="text-[14pt] font-bold tracking-tight">
          {meta.serviceName} — Handoff
        </h1>
        <p className="mt-0.5 text-[9pt]">
          {formatHandoffTimestamp(meta.generatedAt)}
          {" · "}
          Full active list · {counts.active} patient{counts.active === 1 ? "" : "s"}
          {" · "}
          U {counts.unstable} · W {counts.watcher} · S {counts.stable}
          {counts.openItems > 0 ? ` · ${counts.openItems} open items` : ""}
          {" · "}
          Ordered by location (rounds path)
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="text-[10pt] italic">No active patients.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[8pt] font-bold uppercase tracking-wide">
              <th className="w-[3%] py-1 pr-1">Sev</th>
              <th className="w-[7%] py-1 pr-1">Loc</th>
              <th className="w-[8%] py-1 pr-1">Att</th>
              <th className="w-[11%] py-1 pr-1">Patient</th>
              <th className="w-[12%] py-1 pr-1">Sx / POD</th>
              <th className="w-[22%] py-1 pr-1">Clinical</th>
              <th className="w-[15%] py-1 pr-1">Labs / Imaging</th>
              <th className="w-[12%] py-1 pr-1">Plan</th>
              <th className="w-[10%] py-1">Dispo</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.locationKey}>
                <tr className="break-inside-avoid">
                  <td
                    colSpan={9}
                    className="border-b border-slate-400 bg-slate-100 px-1 py-0.5 text-[8.5pt] font-bold uppercase tracking-wide"
                  >
                    {group.locationLabel}
                    <span className="ml-2 font-normal normal-case tracking-normal text-slate-600">
                      ({group.rows.length})
                    </span>
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <HandoffRowTr key={row.cardId} row={row} />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      {actionRollup.length > 0 && (
        <section className="mt-3 break-inside-avoid border-t-2 border-black pt-2">
          <h2 className="text-[10pt] font-bold uppercase tracking-wide">
            Open items rollup ({actionRollup.length})
          </h2>
          <ul className="mt-1 list-disc pl-4 text-[9pt]">
            {actionRollup.map((item, i) => (
              <li key={`${item.patient}-${i}`} className="mb-0.5">
                <span className="font-semibold">
                  {item.location ? `${item.location} · ` : ""}
                  {item.patient}:
                </span>{" "}
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HandoffRowTr({ row }: { row: HandoffRow }) {
  const sevClass =
    row.severity === "unstable"
      ? "font-bold text-red-800"
      : row.severity === "watcher"
        ? "font-semibold text-amber-900"
        : "text-slate-700";

  const sxParts = [
    row.surgeryLine,
    row.podLabel,
    row.weightBearing.length ? row.weightBearing.join(", ") : "",
  ].filter(Boolean);

  return (
    <tr
      className={`break-inside-avoid border-b border-slate-300 align-top ${
        row.severity === "unstable"
          ? "bg-red-50"
          : row.severity === "watcher"
            ? "bg-amber-50/50"
            : ""
      }`}
    >
      <td className={`px-0.5 py-1 text-center ${sevClass}`}>{row.severityLetter}</td>
      <td className="px-0.5 py-1 font-semibold">{row.location || "—"}</td>
      <td className="px-0.5 py-1">{row.attending || "—"}</td>
      <td className="px-0.5 py-1 font-bold">
        {row.pinned ? "📌 " : ""}
        {row.patient || "—"}
      </td>
      <td className="whitespace-pre-wrap px-0.5 py-1">
        {sxParts.length ? sxParts.join("\n") : "—"}
      </td>
      <td className="whitespace-pre-wrap px-0.5 py-1">{row.clinical || "—"}</td>
      <td className="whitespace-pre-wrap px-0.5 py-1">{row.labs || "—"}</td>
      <td className="whitespace-pre-wrap px-0.5 py-1">
        {row.plan || "—"}
        {row.tags.length > 0 && (
          <div className="mt-0.5 text-[8pt] text-slate-600">
            {row.tags.map((t) => `#${t}`).join(" ")}
          </div>
        )}
      </td>
      <td className="whitespace-pre-wrap bg-emerald-50/40 px-0.5 py-1">
        {row.dispo || "—"}
      </td>
    </tr>
  );
}
