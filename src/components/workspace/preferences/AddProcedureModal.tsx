"use client";

import React, { useState } from "react";
import { X, Plus } from "lucide-react";

type Props = {
  onClose: () => void;
  onCreated: (procedure: { id: string; name: string }) => void;
};

export function AddProcedureModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [subspecialty, setSubspecialty] = useState("");
  const [approach, setApproach] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/program/ap-procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          abbreviation: abbreviation.trim() || null,
          subspecialty: subspecialty.trim() || null,
          approach: approach.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("A procedure with this name already exists.");
        } else {
          setError(data.error ?? "Failed to create procedure.");
        }
        return;
      }
      onCreated({ id: data.procedure.id, name: trimmedName });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-[2rem] border border-white/10 bg-slate-900 p-6 sm:rounded-[2rem]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Add Procedure</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">
              Procedure Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Total Knee Arthroplasty"
              required
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">
                Abbreviation
              </label>
              <input
                type="text"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="e.g. TKA"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">
                Subspecialty
              </label>
              <input
                type="text"
                value={subspecialty}
                onChange={(e) => setSubspecialty(e.target.value)}
                placeholder="e.g. Arthroplasty"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">
              Approach
            </label>
            <input
              type="text"
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="e.g. Medial parapatellar"
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Creating…" : "Create Procedure"}
          </button>
        </form>
      </div>
    </div>
  );
}
