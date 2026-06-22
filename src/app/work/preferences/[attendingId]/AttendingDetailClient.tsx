"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, FileText, ChevronRight, Star } from "lucide-react";
import type { ApCardSummary } from "@/lib/workspace/preferences/types";
import { StalenessBadge } from "@/components/workspace/preferences/StalenessBadge";
import { AddCardModal } from "@/components/workspace/preferences/AddCardModal";

type Attending = {
  id: string;
  fullName: string;
  displayName: string | null;
  specialty: string | null;
};

type Props = { attendingId: string };

function AttendingInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10 text-lg font-bold text-sky-300 ring-1 ring-sky-300/15">
      {initials}
    </div>
  );
}

export function AttendingDetailClient({ attendingId }: Props) {
  const router = useRouter();
  const [attending, setAttending] = useState<Attending | null>(null);
  const [cards, setCards] = useState<ApCardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCardOpen, setAddCardOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/program/attendings`).then((r) => r.json()),
      fetch(`/api/program/ap-cards?attendingId=${attendingId}`).then((r) => r.json()),
    ])
      .then(([attendingsData, cardsData]) => {
        const rows = (attendingsData.attendings ?? attendingsData.data ?? []) as Array<{
          id: string;
          full_name?: string;
          fullName?: string;
          display_name?: string | null;
          displayName?: string | null;
          specialty?: string | null;
        }>;
        const found = rows.find((a) => a.id === attendingId);
        if (found) {
          setAttending({
            id: found.id,
            fullName: found.full_name ?? found.fullName ?? "",
            displayName: found.display_name ?? found.displayName ?? null,
            specialty: found.specialty ?? null,
          });
        }
        setCards(cardsData.cards ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [attendingId]);

  function handleCardCreated(cardId: string) {
    setAddCardOpen(false);
    router.push(`/work/preferences/${attendingId}/${cardId}`);
  }

  const totalHighYield = cards.reduce((sum, c) => sum + c.highYieldCount, 0);
  const totalItems = cards.reduce((sum, c) => sum + c.itemCount, 0);
  const attendingLabel = attending ? (attending.displayName ?? attending.fullName) : "…";

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">

      {/* ── Compact sticky action bar ─────────────────────────────
          Mirrors card page: back link on left, primary action right.  */}
      <div className="sticky top-[52px] z-10 border-b border-white/[0.07] bg-slate-950/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href="/work/preferences"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Preferences
          </Link>

          {attending && (
            <button
              type="button"
              onClick={() => setAddCardOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add card
            </button>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">

          {/* ── Page header ───────────────────────────────────────── */}
          <div className="py-6 sm:py-8">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-1 text-xs text-white/30" aria-label="Breadcrumb">
              <Link href="/work/preferences" className="transition hover:text-white/60">
                Preferences
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
              <span className="text-white/50">{attendingLabel}</span>
            </nav>

            {loading ? (
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/[0.06]" />
                <div className="space-y-2">
                  <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
                  <div className="h-4 w-28 animate-pulse rounded bg-white/[0.06]" />
                </div>
              </div>
            ) : attending ? (
              <div className="flex items-start gap-4">
                <AttendingInitials name={attending.fullName} />
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {attending.displayName ?? attending.fullName}
                  </h1>
                  {attending.specialty && (
                    <p className="mt-1 text-base text-white/50">{attending.specialty}</p>
                  )}
                  {/* Stats row */}
                  {cards.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-white/40">
                        {cards.length} card{cards.length !== 1 ? "s" : ""}
                      </span>
                      <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-white/40">
                        {totalItems} item{totalItems !== 1 ? "s" : ""}
                      </span>
                      {totalHighYield > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                          <Star className="h-3 w-3" />
                          {totalHighYield} need to know
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/40">Attending not found.</p>
            )}
          </div>

          {/* ── Preference cards list ──────────────────────────────── */}
          <div className="pb-16">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">
              Preference Cards
            </p>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-[78px] animate-pulse rounded-[1.75rem] bg-white/[0.04]" />
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] px-6 py-12 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-white/20" />
                <p className="text-sm font-semibold text-white/50">No preference cards yet</p>
                <p className="mt-1 text-xs text-white/25">
                  Create a card to start capturing this attending&apos;s preferences.
                </p>
                {attending && (
                  <button
                    type="button"
                    onClick={() => setAddCardOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-500/20 px-4 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create first card
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map((card) => {
                  const label = [card.procedureName, card.procedureApproach]
                    .filter(Boolean)
                    .join(" — ");
                  return (
                    <Link
                      key={card.id}
                      href={`/work/preferences/${attendingId}/${card.id}`}
                      className="flex items-center gap-3.5 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 transition hover:bg-white/[0.05]"
                    >
                      {/* Procedure icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Procedure name + approach */}
                        <p className="truncate text-sm font-bold text-white/85">{label}</p>

                        {/* Site */}
                        {card.site && (
                          <p className="text-xs text-white/35">{card.site}</p>
                        )}

                        {/* Meta row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-white/25">
                            {card.itemCount} item{card.itemCount !== 1 ? "s" : ""}
                          </span>
                          {card.highYieldCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-amber-400/60">
                              <Star className="h-3 w-3" />
                              {card.highYieldCount}
                            </span>
                          )}
                          <StalenessBadge updatedAt={card.updatedAt} />
                        </div>
                      </div>

                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {addCardOpen && attending && (
        <AddCardModal
          attendingId={attendingId}
          attendingName={attending.displayName ?? attending.fullName}
          onClose={() => setAddCardOpen(false)}
          onCreated={handleCardCreated}
        />
      )}
    </div>
  );
}
