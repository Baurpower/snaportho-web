"use client";

import React, { useRef, useState } from "react";
import { Zap, Trash2, Check, X } from "lucide-react";
import type { ApItem } from "@/lib/workspace/preferences/types";

type Props = {
  item: ApItem;
  editMode: boolean;
  onUpdate: (id: string, patch: { content?: string; isHighYield?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function PreferenceItemRow({ item, editMode, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function commitEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === item.content) {
      setEditing(false);
      setDraft(item.content);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onUpdate(item.id, { content: trimmed });
      setEditing(false);
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(item.content);
    setError(null);
  }

  async function toggleHighYield(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      await onUpdate(item.id, { isHighYield: !item.isHighYield });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    await onDelete(item.id);
  }

  if (editing && editMode) {
    return (
      <li className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitEdit();
            }
            if (e.key === "Escape") cancelEdit();
          }}
          rows={2}
          maxLength={500}
          className="w-full resize-none rounded-lg bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
          autoFocus
        />
        {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={commitEdit}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> Save
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white/40 transition hover:text-white/70"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`group flex items-start gap-2.5 rounded-xl px-2 py-2 transition ${
        editMode ? "hover:bg-white/[0.04] cursor-pointer" : ""
      }`}
      onClick={() => {
        if (editMode) {
          setEditing(true);
          setDraft(item.content);
        }
      }}
    >
      {/* High-yield indicator dot — tappable in edit mode */}
      {editMode ? (
        <button
          type="button"
          onClick={toggleHighYield}
          onTouchEnd={toggleHighYield}
          disabled={saving}
          title={item.isHighYield ? "Remove high-yield" : "Mark high-yield"}
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition active:scale-90 disabled:opacity-50 ${
            item.isHighYield
              ? "bg-amber-400/20 text-amber-300"
              : "text-white/20 hover:bg-amber-400/10 hover:text-amber-300"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition ${
            item.isHighYield ? "bg-amber-400" : "bg-white/20"
          }`}
        />
      )}

      <p className="flex-1 text-sm leading-snug text-white/85">{item.content}</p>

      {/* Delete — always visible at low opacity in edit mode, no hover-only hiding */}
      {editMode && (
        <button
          type="button"
          onClick={handleDelete}
          onTouchEnd={handleDelete}
          title="Delete item"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white/20 transition hover:bg-rose-500/10 hover:text-rose-400 active:bg-rose-500/20 active:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}
