"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { buildCopyUpdate } from "@/lib/workspace/signout/copy-update";
import type { PatientIdentifiers, SignoutCard } from "@/lib/workspace/signout/types";

type Props = {
  card: SignoutCard;
  hasIdentifiers: boolean;
  onReveal: () => Promise<PatientIdentifiers>;
};

/** Copy a deterministic attending update assembled directly from stored fields. */
export function DraftPanel({ card, hasIdentifiers, onReveal }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyUpdate() {
    setBusy(true);
    setCopied(false);
    setError(null);
    try {
      const patientName = hasIdentifiers ? (await onReveal()).name : null;
      await navigator.clipboard.writeText(buildCopyUpdate(card, patientName));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't copy the update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button
        type="button"
        onClick={copyUpdate}
        disabled={busy}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {busy ? "Copying…" : copied ? "Update copied" : "Copy update"}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
