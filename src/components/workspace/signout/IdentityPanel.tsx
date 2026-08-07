"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import type { PatientIdentifiers } from "@/lib/workspace/signout/types";

type Props = {
  hasIdentifiers: boolean;
  onSave: (ids: PatientIdentifiers) => Promise<void>;
  onReveal: () => Promise<PatientIdentifiers>;
};

const EMPTY: PatientIdentifiers = { name: "", dob: "", mrn: "" };

/**
 * Quarantined patient identity for a card. Values live under a separate key and are
 * never returned by the normal card path — this panel is the only surface that shows
 * them, and every reveal is server-audited.
 */
export function IdentityPanel({ hasIdentifiers, onSave, onReveal }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PatientIdentifiers>(EMPTY);
  const [revealed, setRevealed] = useState<PatientIdentifiers | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    setBusy(true);
    setError(null);
    try {
      setRevealed(await onReveal());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reveal");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(form);
      setEditing(false);
      setForm(EMPTY);
      setRevealed(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
      >
        <Lock className="h-3.5 w-3.5" />
        {hasIdentifiers ? "Patient identity on file" : "Add patient identity"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">
          {error && <p className="mb-1 text-xs font-semibold text-red-600">{error}</p>}

          {revealed ? (
            <div>
              <dl className="space-y-0.5">
                <Row label="Name" value={revealed.name} />
                <Row label="DOB" value={revealed.dob} />
                <Row label="MRN" value={revealed.mrn} />
              </dl>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="h-3 w-3" /> Revealed — this access was logged.
              </p>
              <div className="mt-1.5 flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRevealed(null)}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                >
                  <EyeOff className="h-3.5 w-3.5" /> Hide
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(revealed);
                    setRevealed(null);
                    setEditing(true);
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Edit
                </button>
              </div>
            </div>
          ) : editing || !hasIdentifiers ? (
            <div className="space-y-1.5">
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="DOB" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
              <Field label="MRN" value={form.mrn} onChange={(v) => setForm({ ...form, mrn: v })} />
              <div className="flex gap-2 pt-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-white disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3 w-3 animate-spin" />} Save
                </button>
                {hasIdentifiers && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-slate-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleReveal}
              disabled={busy}
              className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Reveal identity
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-10 text-[11px] font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}
