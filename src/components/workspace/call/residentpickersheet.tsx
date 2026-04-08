"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, UserRound, X, Check, Eraser } from "lucide-react";
import type { ResidentOption } from "@/components/workspace/call/programcalltypes";

type ResidentPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  groupedResidents: Array<[string, ResidentOption[]]>;
  currentMembershipId: string | null;
  onSelectResident: (membershipId: string) => void;
  onClearResident?: () => void;
};

function pgyLabel(resident: {
  trainingLevel: string | null;
  pgyYear: number | null;
}) {
  if (resident.trainingLevel) return resident.trainingLevel;
  if (typeof resident.pgyYear === "number") return `PGY-${resident.pgyYear}`;
  return "Unknown";
}

export default function ResidentPickerSheet({
  open,
  onClose,
  title = "Select resident",
  searchValue,
  onSearchChange,
  groupedResidents,
  currentMembershipId,
  onSelectResident,
  onClearResident,
}: ResidentPickerSheetProps) {
  const totalResidents = groupedResidents.reduce(
    (sum, [, residents]) => sum + residents.length,
    0
  );

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[140] bg-slate-950/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed right-0 top-0 z-[150] flex h-full w-full max-w-[34rem] flex-col border-l border-slate-200 bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="shrink-0 border-b border-slate-200 px-5 py-5 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    <UserRound className="h-3.5 w-3.5" />
                    Resident Picker
                  </div>

                  <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a resident quickly from a PGY-ordered list.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by resident name or PGY"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {totalResidents} available
                </span>

                {onClearResident ? (
                  <button
                    type="button"
                    onClick={onClearResident}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Clear assignment
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
              {groupedResidents.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <UserRound className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    No residents found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try a different search or adjust the assignment rules.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedResidents.map(([groupLabel, residents]) => (
                    <div key={groupLabel}>
                      <div className="mb-2 px-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {groupLabel}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {residents.map((resident) => {
                          const isSelected =
                            currentMembershipId === resident.membershipId;

                          return (
                            <button
                              key={resident.membershipId}
                              type="button"
                              onClick={() =>
                                onSelectResident(resident.membershipId)
                              }
                              className={`flex w-full items-center justify-between gap-3 rounded-[1rem] border px-4 py-3 text-left transition ${
                                isSelected
                                  ? "border-sky-300 bg-sky-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {resident.displayName}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {pgyLabel(resident)}
                                </p>
                              </div>

                              <div className="shrink-0">
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                    <Check className="h-3.5 w-3.5" />
                                    Selected
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 px-5 py-4 md:px-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}