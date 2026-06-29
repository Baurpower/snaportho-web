"use client";

import { CalendarPlus2, X } from "lucide-react";

export function SharedPlanWeekButton({
  isOpen,
  onClick,
  closedClassName = "border border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300 hover:bg-sky-100",
  openClassName = "bg-slate-950 text-white shadow-sm",
  closedLabel = "Plan Week",
  openLabel = "Close Planner",
}: {
  isOpen: boolean;
  onClick: () => void;
  closedClassName?: string;
  openClassName?: string;
  closedLabel?: string;
  openLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
        isOpen ? openClassName : closedClassName
      }`}
    >
      {isOpen ? <X className="h-4 w-4" /> : <CalendarPlus2 className="h-4 w-4" />}
      {isOpen ? openLabel : closedLabel}
    </button>
  );
}
