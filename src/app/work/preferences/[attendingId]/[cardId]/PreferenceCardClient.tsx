"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, ChevronRight, ChevronsUpDown } from "lucide-react";
import type { ApFullCard, ApSectionWithItems } from "@/lib/workspace/preferences/types";
import {
  SECTION_GROUPS,
  UNGROUPED_GROUP,
  UNGROUPED_ID,
  getGroupIdForTitle,
} from "@/lib/workspace/preferences/section-groups";
import { BeforeYouScrubBanner } from "@/components/workspace/preferences/BeforeYouScrubBanner";
import {
  PreferenceSectionGroup,
  type GroupDisplayDef,
} from "@/components/workspace/preferences/PreferenceSectionGroup";
import { StalenessBadge } from "@/components/workspace/preferences/StalenessBadge";

type Props = { attendingId: string; cardId: string };

/** Resolved group: the def + the sections that belong to it. */
type ResolvedGroup = {
  def: GroupDisplayDef;
  sections: ApSectionWithItems[];
};

function buildGroups(activeSections: ApSectionWithItems[]): ResolvedGroup[] {
  // Bucket sections by group id
  const buckets = new Map<string, ApSectionWithItems[]>();
  for (const s of activeSections) {
    const gid = getGroupIdForTitle(s.title);
    const list = buckets.get(gid) ?? [];
    list.push(s);
    buckets.set(gid, list);
  }

  const result: ResolvedGroup[] = [];

  // Emit canonical groups in order (only if they have sections on this card)
  for (const groupDef of SECTION_GROUPS) {
    const sections = buckets.get(groupDef.id);
    if (sections && sections.length > 0) {
      result.push({ def: groupDef, sections });
    }
  }

  // Emit "Other" bucket last (legacy / unknown sections)
  const ungrouped = buckets.get(UNGROUPED_ID);
  if (ungrouped && ungrouped.length > 0) {
    result.push({ def: UNGROUPED_GROUP, sections: ungrouped });
  }

  return result;
}

export function PreferenceCardClient({ attendingId, cardId }: Props) {
  const [card, setCard] = useState<ApFullCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Section-level collapse: Set of section IDs that are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  // Group-level collapse: Set of group IDs that are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/program/ap-cards/${cardId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.card) {
          const loadedCard: ApFullCard = d.card;
          setCard(loadedCard);

          const totalItems = loadedCard.sections.reduce(
            (sum, s) => sum + s.items.filter((i) => i.isActive).length,
            0
          );

          // Auto edit-mode on brand-new empty cards
          if (totalItems === 0) setEditMode(true);

          // Collapse sections with no items; expand sections that have content
          const initCollapsedSections = new Set<string>();
          loadedCard.sections.forEach((s) => {
            const hasItems = s.items.some((i) => i.isActive);
            if (!hasItems) initCollapsedSections.add(s.id);
          });
          setCollapsedSections(initCollapsedSections);

          // All groups start expanded; no groups start collapsed
          setCollapsedGroups(new Set());
        } else {
          setError("Card not found.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load card.");
        setLoading(false);
      });
  }, [cardId]);

  /** Active sections sorted by sort_order */
  const activeSections = useMemo(
    () =>
      (card?.sections ?? [])
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [card?.sections]
  );

  /** Grouped structure for rendering */
  const groups = useMemo(() => buildGroups(activeSections), [activeSections]);

  // ── Collapse helpers ──────────────────────────────────────────

  function toggleSection(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) { next.delete(sectionId); } else { next.add(sectionId); }
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) { next.delete(groupId); } else { next.add(groupId); }
      return next;
    });
  }

  const allGroupsCollapsed = groups.length > 0 && groups.every((g) => collapsedGroups.has(g.def.id));

  function expandAllGroups() {
    setCollapsedGroups(new Set());
    // Also expand sections that have items when revealing groups
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      activeSections.forEach((s) => {
        const hasItems = s.items.some((i) => i.isActive);
        if (hasItems) next.delete(s.id);
      });
      return next;
    });
  }

  function collapseAllGroups() {
    setCollapsedGroups(new Set(groups.map((g) => g.def.id)));
  }

  // ── Item handlers ─────────────────────────────────────────────

  const handleUpdateItem = useCallback(
    async (itemId: string, patch: { content?: string; isHighYield?: boolean }) => {
      const res = await fetch(`/api/program/ap-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Update failed");

      setCard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          sections: prev.sections.map((s) => ({
            ...s,
            items: s.items.map((item) =>
              item.id === itemId ? { ...item, ...d.item } : item
            ),
          })),
        };
      });
    },
    []
  );

  const handleDeleteItem = useCallback(async (itemId: string) => {
    const res = await fetch(`/api/program/ap-items/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Delete failed");
    }
    setCard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          items: s.items.filter((item) => item.id !== itemId),
        })),
      };
    });
  }, []);

  const handleAddItem = useCallback(
    async (sectionId: string, content: string, isHighYield: boolean) => {
      const sectionItems =
        card?.sections
          .find((s) => s.id === sectionId)
          ?.items.filter((i) => i.isActive) ?? [];
      const sortOrder = sectionItems.length;

      const res = await fetch("/api/program/ap-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, content, isHighYield, sortOrder }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Add failed");

      setCard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          sections: prev.sections.map((s) =>
            s.id === sectionId ? { ...s, items: [...s.items, d.item] } : s
          ),
        };
      });

      // Ensure the section that just received an item is visible
      setCollapsedSections((prev) => {
        if (!prev.has(sectionId)) return prev;
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });

      // Ensure the group containing this section is also visible
      const groupId = card?.sections
        ? getGroupIdForTitle(
            card.sections.find((s) => s.id === sectionId)?.title ?? ""
          )
        : null;
      if (groupId) {
        setCollapsedGroups((prev) => {
          if (!prev.has(groupId)) return prev;
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      }
    },
    [card?.sections]
  );

  // ── Loading / error states ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-5 h-4 w-28 animate-pulse rounded bg-white/[0.06]" />
          <div className="mb-3 h-10 w-64 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-[1.75rem] bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <p className="text-sm text-rose-400">{error ?? "Card not found."}</p>
        <Link
          href={`/work/preferences/${attendingId}`}
          className="mt-4 text-xs text-sky-400 transition hover:text-sky-300"
        >
          Back to attending
        </Link>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  const procedureLabel = [card.procedureName, card.procedureApproach]
    .filter(Boolean)
    .join(" — ");

  const attendingLabel = card.attendingDisplayName ?? card.attendingFullName;

  const totalItems = activeSections.reduce(
    (sum, s) => sum + s.items.filter((i) => i.isActive).length,
    0
  );
  const isEmptyCard = totalItems === 0;
  const totalSections = activeSections.length;
  const totalGroups = groups.length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">

      {/* ── Compact sticky action bar ─────────────────────────────
          Contains only navigation (back) and the edit toggle.
          Sticks below the global Nav (top-[52px]).              */}
      <div className="sticky top-[52px] z-10 border-b border-white/[0.07] bg-slate-950/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href={`/work/preferences/${attendingId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {attendingLabel}
          </Link>

          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              editMode
                ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                : "border border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {editMode ? (
              <>
                <Check className="h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">

          {/* ── Page header ───────────────────────────────────────
              Breadcrumb + large title + subtitle + staleness.    */}
          <div className="py-6 sm:py-8">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-1 text-xs text-white/30" aria-label="Breadcrumb">
              <Link
                href="/work/preferences"
                className="transition hover:text-white/60"
              >
                Preferences
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
              <Link
                href={`/work/preferences/${attendingId}`}
                className="transition hover:text-white/60"
              >
                {attendingLabel}
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
              <span className="text-white/50">{procedureLabel}</span>
            </nav>

            {/* Procedure name — large */}
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {procedureLabel}
            </h1>

            {/* Attending + site subtitle */}
            <p className="mt-2 text-base text-white/50">
              {attendingLabel}
              {card.site ? <span className="text-white/25"> · {card.site}</span> : null}
            </p>

            {/* Staleness + subspecialty */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StalenessBadge
                updatedAt={card.updatedAt}
                updatedByName={card.updatedByName}
              />
              {card.procedureSubspecialty && (
                <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                  {card.procedureSubspecialty}
                </span>
              )}
            </div>
          </div>

          {/* Onboarding banner — only on empty cards in edit mode */}
          {isEmptyCard && editMode && (
            <div className="mb-5 rounded-[1.5rem] border border-sky-400/15 bg-sky-500/[0.06] px-5 py-4">
              <p className="text-sm font-semibold text-sky-200">
                Start building this preference card
              </p>
              <p className="mt-1 text-xs leading-relaxed text-sky-300/60">
                Open any group below and add notes to a section. Use{" "}
                <span className="font-semibold text-amber-300/80">⚡ Mark high-yield</span> on
                critical items — they&apos;ll appear in the{" "}
                <span className="font-semibold text-amber-300/80">Before You Scrub</span> checklist
                above.
              </p>
            </div>
          )}

          {/* Before You Scrub — always visible */}
          <BeforeYouScrubBanner sections={card.sections} />

          {/* Toolbar — group count + expand/collapse all */}
          {groups.length > 1 && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/20">
                {totalGroups} group{totalGroups !== 1 ? "s" : ""} ·{" "}
                {totalSections} section{totalSections !== 1 ? "s" : ""} ·{" "}
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={allGroupsCollapsed ? expandAllGroups : collapseAllGroups}
                className="flex items-center gap-1 text-[11px] font-semibold text-white/30 transition hover:text-white/60"
              >
                <ChevronsUpDown className="h-3 w-3" />
                {allGroupsCollapsed ? "Expand all" : "Collapse all"}
              </button>
            </div>
          )}

          {/* Groups */}
          <div className="space-y-3 pb-16">
            {groups.map((g) => (
              <PreferenceSectionGroup
                key={g.def.id}
                group={g.def}
                sections={g.sections}
                isGroupCollapsed={collapsedGroups.has(g.def.id)}
                onToggleGroup={() => toggleGroup(g.def.id)}
                editMode={editMode}
                collapsedSections={collapsedSections}
                onToggleSection={toggleSection}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
              />
            ))}

            {groups.length === 0 && (
              <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] px-6 py-10 text-center">
                <p className="text-sm text-white/30">No sections found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
