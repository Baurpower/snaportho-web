"use client";

import React, { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Zap } from "lucide-react";
import type { ApSectionWithItems } from "@/lib/workspace/preferences/types";
import { PreferenceItemRow } from "./PreferenceItemRow";

type Props = {
  section: ApSectionWithItems;
  editMode: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateItem: (id: string, patch: { content?: string; isHighYield?: boolean }) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onAddItem: (sectionId: string, content: string, isHighYield: boolean) => Promise<void>;
};

export function PreferenceSectionView({
  section,
  editMode,
  collapsed,
  onToggleCollapse,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: Props) {
  const [addingItem, setAddingItem] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newIsHighYield, setNewIsHighYield] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeItems = section.items
    .filter((i) => i.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  async function submitAdd() {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    setAddingSaving(true);
    setAddError(null);
    try {
      await onAddItem(section.id, trimmed, newIsHighYield);
      // Keep form open — clear and refocus for rapid consecutive entry
      setNewContent("");
      setNewIsHighYield(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch {
      setAddError("Failed to add item.");
    } finally {
      setAddingSaving(false);
    }
  }

  function cancelAdd() {
    setAddingItem(false);
    setNewContent("");
    setNewIsHighYield(false);
    setAddError(null);
  }

  function openAddForm() {
    setAddingItem(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <div className="rounded-[1.25rem] border border-white/[0.07] bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="truncate text-sm font-semibold text-white/80">{section.title}</span>
          {activeItems.length > 0 && (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/50">
              {activeItems.length}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-white/30" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0 text-white/30" />
        )}
      </button>

      {!collapsed && (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">
          {activeItems.length === 0 && !editMode && (
            <p className="px-2 py-3 text-sm text-white/25 italic">No items yet.</p>
          )}

          <ul className="space-y-0.5">
            {activeItems.map((item) => (
              <PreferenceItemRow
                key={item.id}
                item={item}
                editMode={editMode}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
              />
            ))}
          </ul>

          {editMode && !addingItem && (
            <button
              type="button"
              onClick={openAddForm}
              className="mt-2 flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-white/35 transition hover:bg-white/[0.05] hover:text-white/60"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
          )}

          {editMode && addingItem && (
            <div className="mt-2 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
              <textarea
                ref={textareaRef}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitAdd();
                  }
                  if (e.key === "Escape") cancelAdd();
                }}
                placeholder="Add a preference item… (Enter to save, Shift+Enter for newline)"
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-lg bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
                autoFocus
              />
              {addError && <p className="mt-1 text-xs text-rose-400">{addError}</p>}

              {/* High-yield toggle + action row */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={addingSaving}
                  onClick={submitAdd}
                  className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-40"
                >
                  {addingSaving ? "Saving…" : "Add"}
                </button>

                {/* High-yield toggle — always visible, works on touch */}
                <button
                  type="button"
                  onClick={() => setNewIsHighYield((v) => !v)}
                  title={newIsHighYield ? "Remove high-yield" : "Mark as high-yield"}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                    newIsHighYield
                      ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30"
                      : "text-white/30 hover:bg-amber-400/10 hover:text-amber-300"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {newIsHighYield ? "High-yield" : "Mark high-yield"}
                </button>

                <button
                  type="button"
                  onClick={cancelAdd}
                  className="ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-white/30 transition hover:text-white/60"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-2 text-[11px] text-white/20">
                Enter to add · Shift+Enter for line break · Esc to close
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
