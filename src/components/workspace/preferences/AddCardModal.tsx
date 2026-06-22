"use client";

import React, { useEffect, useState } from "react";
import { X, Plus, Search } from "lucide-react";
import type { ApProcedure } from "@/lib/workspace/preferences/types";

type Props = {
  attendingId: string;
  attendingName: string;
  onClose: () => void;
  onCreated: (cardId: string) => void;
};

export function AddCardModal({ attendingId, attendingName, onClose, onCreated }: Props) {
  const [procedures, setProcedures] = useState<ApProcedure[]>([]);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<ApProcedure | null>(null);
  const [site, setSite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProcedure, setShowAddProcedure] = useState(false);
  const [newProcName, setNewProcName] = useState("");
  const [creatingProc, setCreatingProc] = useState(false);
  const [procError, setProcError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/program/ap-procedures")
      .then((r) => r.json())
      .then((d) => {
        setProcedures(d.procedures ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredProcedures = procedures.filter(
    (p) =>
      p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
      (p.abbreviation ?? "").toLowerCase().includes(procedureSearch.toLowerCase()) ||
      (p.subspecialty ?? "").toLowerCase().includes(procedureSearch.toLowerCase())
  );

  async function createProcedure() {
    const trimmed = newProcName.trim();
    if (!trimmed) return;
    setCreatingProc(true);
    setProcError(null);
    try {
      const res = await fetch("/api/program/ap-procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) {
        setProcError(d.error ?? "Failed to create.");
        return;
      }
      const newProc: ApProcedure = d.procedure;
      setProcedures((prev) => [newProc, ...prev]);
      setSelectedProcedure(newProc);
      setShowAddProcedure(false);
      setNewProcName("");
    } catch {
      setProcError("Network error.");
    } finally {
      setCreatingProc(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProcedure) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/program/ap-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendingId,
          procedureId: selectedProcedure.id,
          site: site.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError("A preference card already exists for this attending and procedure.");
        } else {
          setError(d.error ?? "Failed to create card.");
        }
        return;
      }
      onCreated(d.cardId);
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
          <div>
            <h2 className="text-base font-bold text-white">New Preference Card</h2>
            <p className="text-xs text-white/40">{attendingName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">
              Procedure <span className="text-rose-400">*</span>
            </label>

            {selectedProcedure ? (
              <div className="flex items-center justify-between rounded-xl border border-sky-400/30 bg-sky-400/10 px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedProcedure.name}</p>
                  {selectedProcedure.approach && (
                    <p className="text-xs text-white/40">{selectedProcedure.approach}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProcedure(null)}
                  className="text-white/30 transition hover:text-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={procedureSearch}
                    onChange={(e) => setProcedureSearch(e.target.value)}
                    placeholder="Search procedures…"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                  />
                </div>
                {loading ? (
                  <p className="mt-2 text-xs text-white/30">Loading procedures…</p>
                ) : (
                  <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.03]">
                    {filteredProcedures.length === 0 ? (
                      <p className="px-3.5 py-3 text-sm text-white/30">No procedures found.</p>
                    ) : (
                      filteredProcedures.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProcedure(p)}
                          className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition hover:bg-white/[0.06]"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{p.name}</p>
                            <p className="text-xs text-white/35">
                              {[p.subspecialty, p.approach].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}

            {!selectedProcedure && !showAddProcedure && (
              <button
                type="button"
                onClick={() => setShowAddProcedure(true)}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-sky-400 transition hover:text-sky-300"
              >
                <Plus className="h-3.5 w-3.5" /> Add new procedure
              </button>
            )}

            {showAddProcedure && (
              <div className="mt-2 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
                <input
                  type="text"
                  value={newProcName}
                  onChange={(e) => setNewProcName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); createProcedure(); }
                    if (e.key === "Escape") setShowAddProcedure(false);
                  }}
                  placeholder="Procedure name…"
                  className="w-full rounded-lg bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
                  autoFocus
                />
                {procError && <p className="mt-1 text-xs text-rose-400">{procError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={createProcedure}
                    disabled={creatingProc || !newProcName.trim()}
                    className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-300 disabled:opacity-40"
                  >
                    {creatingProc ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddProcedure(false)}
                    className="rounded-lg px-2.5 py-1 text-xs text-white/40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40">
              Site / Location <span className="text-white/20">(optional)</span>
            </label>
            <input
              type="text"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. Main OR, Outpatient Center"
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
            disabled={saving || !selectedProcedure}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Creating…" : "Create Card"}
          </button>
        </form>
      </div>
    </div>
  );
}
