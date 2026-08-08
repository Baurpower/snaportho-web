"use client";

import { useState } from "react";
import { MessageSquare, Copy, Check, RefreshCw, Loader2, X } from "lucide-react";

import type { PatientIdentifiers } from "@/lib/workspace/signout/types";

type Props = {
  hasIdentifiers: boolean;
  onGenerate: () => Promise<string>; // draft containing the literal {{name}} token
  onReveal: () => Promise<PatientIdentifiers>; // audited name reveal
};

const NAME_TOKEN = "{{name}}";

/**
 * Generate a de-identified attending-update draft. The model returns a {{name}} token;
 * the name is spliced in HERE (client-side) from the audited identity reveal, so it never
 * reaches OpenAI. Draft-only — the user copies it into their own messaging app.
 */
export function DraftPanel({ hasIdentifiers, onGenerate, onReveal }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState<string | null>(null); // cached across regenerates
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function splice(raw: string, patientName: string | null): string {
    return raw.split(NAME_TOKEN).join(patientName?.trim() || "[Name]");
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const raw = await onGenerate();
      let patientName = name;
      if (patientName === null && hasIdentifiers) {
        patientName = (await onReveal()).name;
        setName(patientName);
      }
      setDraft(splice(raw, patientName));
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate text");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy — select the text and copy manually.");
    }
  }

  if (!open) {
    return (
      <div className="mt-2 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
          Generate text
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <MessageSquare className="h-3.5 w-3.5" /> Attending update
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <p className="mb-1 text-xs font-semibold text-red-600">{error}</p>}

      {busy && !draft ? (
        <p className="flex items-center gap-1 py-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…
        </p>
      ) : (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(14, Math.max(4, draft.split("\n").length + 1))}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-400"
          />
          <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
