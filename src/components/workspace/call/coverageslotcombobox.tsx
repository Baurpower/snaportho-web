"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { ProgramAttendingCoverageSlot } from "@/lib/workspace/call/types";

type CoverageSlotComboboxProps = {
  slots: ProgramAttendingCoverageSlot[];
  selectedId: string;
  onSelect: (slotId: string) => void;
  onCreate: () => void;
};

export default function CoverageSlotCombobox({
  slots,
  selectedId,
  onSelect,
  onCreate,
}: CoverageSlotComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = slots.find((slot) => slot.id === selectedId);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color || "#38bdf8" }}
            />
          ) : null}
          <span className="truncate">{selected?.name ?? "Choose slot"}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-50 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
            {slots.length ? (
              slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    onSelect(slot.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  role="option"
                  aria-selected={slot.id === selectedId}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slot.color || "#38bdf8" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{slot.name}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {slot.abbreviation}
                  </span>
                  {slot.id === selectedId ? (
                    <Check className="h-4 w-4 shrink-0 text-teal-600" />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-sm text-slate-500">
                No coverage slots yet.
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100">
                <Plus className="h-4 w-4" />
              </span>
              Add a new coverage slot
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
