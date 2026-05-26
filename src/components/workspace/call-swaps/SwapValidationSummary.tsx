"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type SwapValidationSummaryProps = {
  validation?:
    | {
        errors?: string[] | null;
        warnings?: string[] | null;
      }
    | null;
  emptyMessage?: string;
};

export default function SwapValidationSummary({
  validation,
  emptyMessage = "No conflicts detected",
}: SwapValidationSummaryProps) {
  const errors = validation?.errors?.filter(Boolean) ?? [];
  const warnings = validation?.warnings?.filter(Boolean) ?? [];

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 ? (
        <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {errors.map((message, index) => (
                <p key={`${message}-${index}`}>{message}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {warnings.map((message, index) => (
                <p key={`${message}-${index}`}>{message}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
