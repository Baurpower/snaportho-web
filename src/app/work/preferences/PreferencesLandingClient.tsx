"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  User,
  Plus,
  X,
  Zap,
  FileText,
} from "lucide-react";
import type {
  ApSearchResults,
} from "@/lib/workspace/preferences/types";

type ProgramAttending = {
  id: string;
  fullName: string;
  displayName: string | null;
  specialty: string | null;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function AttendingInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10 text-sm font-bold text-sky-300 ring-1 ring-sky-300/15">
      {initials}
    </div>
  );
}

export function PreferencesLandingClient() {
  const router = useRouter();
  const [attendings, setAttendings] = useState<ProgramAttending[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApSearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const [addAttendingOpen, setAddAttendingOpen] = useState(false);
  const [newAttendingName, setNewAttendingName] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/program/attendings")
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.attendings ?? d.data ?? []) as Array<{
          id: string;
          full_name?: string;
          fullName?: string;
          display_name?: string | null;
          displayName?: string | null;
          specialty?: string | null;
        }>;
        setAttendings(
          rows.map((a) => ({
            id: a.id,
            fullName: a.full_name ?? a.fullName ?? "",
            displayName: a.display_name ?? a.displayName ?? null,
            specialty: a.specialty ?? null,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    fetch(`/api/program/ap-search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d: ApSearchResults) => {
        setSearchResults(d);
        setSearchLoading(false);
      })
      .catch(() => setSearchLoading(false));
  }, [debouncedQuery]);

  async function addAttending() {
    const trimmed = newAttendingName.trim();
    if (!trimmed) return;
    setAddingSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/program/attendings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) {
        setAddError(d.error ?? "Failed to add attending.");
        return;
      }
      const newId = d.id ?? d.attending?.id;
      const newA: ProgramAttending = {
        id: newId,
        fullName: trimmed,
        displayName: null,
        specialty: null,
      };
      setAttendings((prev) => [newA, ...prev]);
      setAddAttendingOpen(false);
      setNewAttendingName("");
      router.push(`/work/preferences/${newId}`);
    } catch {
      setAddError("Network error.");
    } finally {
      setAddingSaving(false);
    }
  }

  const isSearching = debouncedQuery.length >= 2;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="flex-1 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">

          {/* ── Page header ───────────────────────────────────────── */}
          <div className="py-6 sm:py-8">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Preferences
            </h1>
            <p className="mt-2 text-base text-white/50">
              Reference cards for every attending in your program.
            </p>

            {/* Search */}
            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search attendings, procedures, preference items…"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-10 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/40 focus:bg-white/[0.07] focus:ring-1 focus:ring-sky-400/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Search results ────────────────────────────────────── */}
          {isSearching && (
            <div className="space-y-5 pb-16">
              {searchLoading && (
                <p className="text-sm text-white/30">Searching…</p>
              )}

              {!searchLoading && searchResults && (
                <>
                  {searchResults.attendings.length === 0 &&
                    searchResults.cards.length === 0 &&
                    searchResults.items.length === 0 && (
                      <p className="text-sm text-white/30">No results for &ldquo;{debouncedQuery}&rdquo;.</p>
                    )}

                  {searchResults.attendings.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                        Attendings
                      </p>
                      <div className="space-y-2">
                        {searchResults.attendings.map((a) => (
                          <Link
                            key={a.attendingId}
                            href={`/work/preferences/${a.attendingId}`}
                            className="flex items-center gap-3.5 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition hover:bg-white/[0.05]"
                          >
                            <AttendingInitials name={a.attendingFullName} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-white/85">
                                {a.attendingDisplayName ?? a.attendingFullName}
                              </p>
                              <p className="text-xs text-white/35">
                                {a.cardCount} preference card{a.cardCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.cards.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                        Cards
                      </p>
                      <div className="space-y-2">
                        {searchResults.cards.map((c) => (
                          <Link
                            key={c.cardId}
                            href={`/work/preferences/${c.attendingId}/${c.cardId}`}
                            className="flex items-center gap-3.5 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition hover:bg-white/[0.05]"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-white/85">
                                {c.procedureName}
                              </p>
                              <p className="text-xs text-white/40">
                                {c.attendingDisplayName ?? c.attendingFullName}
                                {c.site ? <span className="text-white/25"> · {c.site}</span> : null}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.items.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                        Preference Items
                      </p>
                      <div className="space-y-2">
                        {searchResults.items.map((item) => (
                          <Link
                            key={item.itemId}
                            href={`/work/preferences/${item.attendingId}/${item.cardId}`}
                            className="flex items-start gap-3.5 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition hover:bg-white/[0.05]"
                          >
                            <div
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                                item.isHighYield
                                  ? "bg-amber-400/15 text-amber-300"
                                  : "bg-white/[0.07] text-white/30"
                              }`}
                            >
                              <Zap className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-snug text-white/85">{item.content}</p>
                              <p className="mt-0.5 text-xs text-white/35">
                                {item.attendingFullName} · {item.procedureName} · {item.sectionTitle}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Attending list ────────────────────────────────────── */}
          {!isSearching && (
            <div className="pb-16">
              {/* List header */}
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  {loading ? "Loading…" : `${attendings.length} attending${attendings.length !== 1 ? "s" : ""}`}
                </p>
                <button
                  type="button"
                  onClick={() => setAddAttendingOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add attending
                </button>
              </div>

              {/* Add attending form */}
              {addAttendingOpen && (
                <div className="mb-3 rounded-[1.75rem] border border-sky-400/20 bg-sky-400/[0.05] p-4">
                  <p className="mb-2 text-xs font-semibold text-sky-300/70">New attending</p>
                  <input
                    type="text"
                    value={newAttendingName}
                    onChange={(e) => setNewAttendingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addAttending();
                      if (e.key === "Escape") {
                        setAddAttendingOpen(false);
                        setNewAttendingName("");
                      }
                    }}
                    placeholder="Full name, e.g. Dr. Jane Smith"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition focus:border-sky-400/50"
                    autoFocus
                  />
                  {addError && (
                    <p className="mt-1.5 text-xs text-rose-400">{addError}</p>
                  )}
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={addAttending}
                      disabled={addingSaving || !newAttendingName.trim()}
                      className="rounded-xl bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-40"
                    >
                      {addingSaving ? "Saving…" : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddAttendingOpen(false);
                        setNewAttendingName("");
                      }}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Loading skeletons */}
              {loading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[62px] animate-pulse rounded-[1.75rem] bg-white/[0.04]" />
                  ))}
                </div>
              ) : attendings.length === 0 ? (
                /* Empty state */
                <div className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] px-6 py-12 text-center">
                  <User className="mx-auto mb-3 h-8 w-8 text-white/20" />
                  <p className="text-sm font-semibold text-white/50">No attendings yet</p>
                  <p className="mt-1 text-xs text-white/25">
                    Add an attending to start building preference cards.
                  </p>
                </div>
              ) : (
                /* Attending cards */
                <div className="space-y-2">
                  {attendings.map((a) => (
                    <Link
                      key={a.id}
                      href={`/work/preferences/${a.id}`}
                      className="flex items-center gap-3.5 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition hover:bg-white/[0.05]"
                    >
                      <AttendingInitials name={a.fullName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white/85">
                          {a.displayName ?? a.fullName}
                        </p>
                        {a.specialty ? (
                          <p className="truncate text-xs text-white/35">{a.specialty}</p>
                        ) : (
                          <p className="text-xs text-white/20">View preferences</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
