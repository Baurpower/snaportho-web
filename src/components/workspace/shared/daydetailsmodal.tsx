"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, X, Pencil, Save, Loader2 } from "lucide-react";

type DayDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  dateLabel: string;
  onSave?: () => void | Promise<void>;
  children: (isEditing: boolean) => React.ReactNode;
};

export default function DayDetailsModal({
  open,
  onClose,
  title,
  subtitle,
  dateLabel,
  onSave,
  children,
}: DayDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Only reset state when modal fully closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setIsSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, isSaving, onClose]);

  async function handleEditToggle() {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (!onSave) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save day details", error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    if (isSaving) return;
    setIsEditing(false);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => {
            if (!isSaving) onClose();
          }}
        >
          <motion.div
            className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-5 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {title}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                      {dateLabel}
                    </h3>
                    {subtitle ? (
                      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onSave ? (
                    <>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleEditToggle}
                        disabled={isSaving}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isEditing
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : isEditing ? (
                          <>
                            <Save className="h-4 w-4" />
                            Save
                          </>
                        ) : (
                          <>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </>
                        )}
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5 md:px-6">
              {children(isEditing)}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}