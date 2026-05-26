"use client";

import React, { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";

export type CoverageRecipientOption = {
  rosterId: string;
  programMembershipId: string | null;
  displayName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
};

function getResidentMeta(recipient: CoverageRecipientOption) {
  if (recipient.trainingLevel && recipient.gradYear) {
    return `${recipient.trainingLevel} • Class of ${recipient.gradYear}`;
  }

  if (recipient.trainingLevel) {
    return recipient.trainingLevel;
  }

  if (recipient.gradYear) {
    return `Class of ${recipient.gradYear}`;
  }

  return "Grad year unavailable";
}

export default function RecipientPicker({
  recipients,
  selectedRosterId,
  onSelect,
  filteredOutCount = 0,
}: {
  recipients: CoverageRecipientOption[];
  selectedRosterId: string | null;
  onSelect: (rosterId: string) => void;
  filteredOutCount?: number;
}) {
  const [searchValue, setSearchValue] = useState("");

  const visibleRecipients = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();

    if (!normalized) return recipients;

    return recipients.filter((recipient) => {
      const haystack = [
        recipient.displayName,
        recipient.trainingLevel,
        recipient.gradYear ? `class of ${recipient.gradYear}` : null,
        recipient.pgyYear ? `pgy-${recipient.pgyYear}` : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [recipients, searchValue]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search residents by name or PGY"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      {filteredOutCount > 0 ? (
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {filteredOutCount} resident{filteredOutCount === 1 ? "" : "s"} hidden because they are not eligible for direct coverage requests right now.
        </div>
      ) : null}

      {visibleRecipients.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
          <UserRound className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            No eligible residents found
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try a different search or check back after the roster is updated.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleRecipients.map((recipient) => {
            const isSelected = selectedRosterId === recipient.rosterId;

            return (
              <button
                key={recipient.rosterId}
                type="button"
                onClick={() => onSelect(recipient.rosterId)}
                className={`flex w-full items-center justify-between gap-3 rounded-[1rem] border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-sky-300 bg-sky-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {recipient.displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {getResidentMeta(recipient)}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                    isSelected
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isSelected ? "Selected" : "Choose"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
