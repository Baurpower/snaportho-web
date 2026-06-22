"use client";

import React from "react";
import {
  ChevronRight,
  ClipboardList,
  Layers,
  Pencil,
  HeartPulse,
  Star,
  FolderOpen,
} from "lucide-react";
import type { ApSectionWithItems } from "@/lib/workspace/preferences/types";
import { PreferenceSectionView } from "./PreferenceSectionView";

export type GroupDisplayDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
};

type Props = {
  group: GroupDisplayDef;
  sections: ApSectionWithItems[];
  /** Group-level collapsed: hides all sections inside */
  isGroupCollapsed: boolean;
  onToggleGroup: () => void;
  editMode: boolean;
  collapsedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onUpdateItem: (id: string, patch: { content?: string; isHighYield?: boolean }) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onAddItem: (sectionId: string, content: string, isHighYield: boolean) => Promise<void>;
};

/** Lucide icon lookup by group icon name */
function GroupIcon({ name, className }: { name: string; className: string }) {
  switch (name) {
    case "ClipboardList": return <ClipboardList className={className} />;
    case "Layers":        return <Layers className={className} />;
    case "Pencil":        return <Pencil className={className} />;
    case "HeartPulse":    return <HeartPulse className={className} />;
    case "Star":          return <Star className={className} />;
    default:              return <FolderOpen className={className} />;
  }
}

/** Derive Tailwind classes for a color token. Must be full strings (no interpolation) for Tailwind JIT. */
function colorClasses(color: string): { bg: string; text: string } {
  switch (color) {
    case "sky":     return { bg: "bg-sky-400/15",     text: "text-sky-300" };
    case "emerald": return { bg: "bg-emerald-400/15", text: "text-emerald-300" };
    case "violet":  return { bg: "bg-violet-400/15",  text: "text-violet-300" };
    case "teal":    return { bg: "bg-teal-400/15",    text: "text-teal-300" };
    case "amber":   return { bg: "bg-amber-400/15",   text: "text-amber-300" };
    default:        return { bg: "bg-white/10",        text: "text-white/40" };
  }
}

export function PreferenceSectionGroup({
  group,
  sections,
  isGroupCollapsed,
  onToggleGroup,
  editMode,
  collapsedSections,
  onToggleSection,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: Props) {
  const totalItems = sections.reduce(
    (sum, s) => sum + s.items.filter((i) => i.isActive).length,
    0
  );
  const sectionCount = sections.length;
  const isEmpty = totalItems === 0;
  const { bg, text } = colorClasses(group.color);

  return (
    <div
      id={`group-${group.id}`}
      className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] transition-colors"
    >
      {/* Group header */}
      <button
        type="button"
        onClick={onToggleGroup}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
      >
        {/* Colored icon block */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bg} ${text} ${isEmpty ? "opacity-50" : ""}`}
        >
          <GroupIcon name={group.icon} className="h-5 w-5" />
        </div>

        {/* Title + stats + description */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-bold tracking-tight ${
                isEmpty ? "text-white/40" : "text-white/85"
              }`}
            >
              {group.title}
            </span>

            {/* Section count badge */}
            <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium text-white/40">
              {sectionCount} section{sectionCount !== 1 ? "s" : ""}
            </span>

            {/* Item count badge — only when populated */}
            {totalItems > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${text}`}>
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Description — always visible */}
          <p className={`mt-0.5 text-xs leading-snug ${isEmpty ? "text-white/20" : "text-white/35"}`}>
            {group.description}
          </p>
        </div>

        {/* Right chevron */}
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${
            isGroupCollapsed ? "" : "rotate-90"
          } ${isEmpty ? "text-white/20" : "text-white/40"}`}
        />
      </button>

      {/* Sections */}
      {!isGroupCollapsed && (
        <div className="space-y-1.5 px-2 pb-2.5">
          {sections.map((section) => (
            <div key={section.id} id={`section-${section.id}`}>
              <PreferenceSectionView
                section={section}
                editMode={editMode}
                collapsed={collapsedSections.has(section.id)}
                onToggleCollapse={() => onToggleSection(section.id)}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onAddItem={onAddItem}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
