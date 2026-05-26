"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { useCreateSwapRequest } from "@/hooks/useCreateSwapRequest";
import RecipientPicker, { type CoverageRecipientOption } from "./RecipientPicker";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";

function formatCallDate(call: ProgramCallItem | null) {
  const dateString = call?.callDate ?? call?.startDatetime?.slice(0, 10) ?? null;
  if (!dateString) return "Date unavailable";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getCurrentAcademicYear() {
  return new Date().getFullYear();
}

export default function SwapRequestModal({
  open,
  onClose,
  call,
  programId,
  requesterRosterId,
  recipients,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  call: ProgramCallItem | null;
  programId: string | null;
  requesterRosterId: string | null;
  recipients: CoverageRecipientOption[];
  onCreated?: () => void | Promise<void>;
}) {
  const { createRequest, loading, error, setError } = useCreateSwapRequest();
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const eligibleRecipients = useMemo(() => {
    const currentYear = getCurrentAcademicYear();
    return recipients.filter((recipient) => {
      if (!requesterRosterId || recipient.rosterId === requesterRosterId) return false;
      if (recipient.gradYear === null) return false;
      if (recipient.gradYear < currentYear) return false;
      return true;
    });
  }, [recipients, requesterRosterId]);

  const filteredOutCount = recipients.length - eligibleRecipients.length;

  async function handleSubmit() {
    if (!call?.id || !programId || !requesterRosterId || !selectedRecipientId) {
      setError("Choose a resident before sending this request.");
      return;
    }

    try {
      const result = await createRequest({
        programId,
        requesterRosterId,
        recipientRosterId: selectedRecipientId,
        requesterCallId: call.id,
        requestType: "coverage_only",
        requesterNote: note.trim() || null,
      });

      setWarnings(result.warnings ?? []);
      setSuccessMessage(
        "Coverage request sent. If they accept, this will be sent to an admin for final approval."
      );
      await onCreated?.();
    } catch {
      // hook already stores the message
    }
  }

  function handleClose() {
    if (loading) return;
    setSelectedRecipientId(null);
    setNote("");
    setSuccessMessage(null);
    setWarnings([]);
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[170] bg-slate-950/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed inset-x-0 top-1/2 z-[180] mx-auto w-full max-w-3xl -translate-y-1/2 px-4"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
          >
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-5 py-5 md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Request coverage
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                      Ask one resident to cover this call
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This does not officially change the schedule yet. If they accept, this will be sent to an admin for final approval.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[75vh] overflow-y-auto px-5 py-5 md:px-6">
                {successMessage ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5" />
                        <div>
                          <p className="text-lg font-bold">Request sent</p>
                          <p className="mt-1 text-sm leading-6">{successMessage}</p>
                        </div>
                      </div>
                    </div>

                    {warnings.length > 0 ? (
                      <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {warnings.join(" ")}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Selected call
                      </p>
                      <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                        {call?.callType ?? "Call"} • {formatCallDate(call)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {call?.site ?? "No service/site listed"}
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5" />
                        <div>
                          <p className="font-semibold">Official schedule changes only after approval</p>
                          <p className="mt-1 leading-6">
                            Sending this request starts the conversation. The call assignment only changes if the recipient accepts and an admin approves it.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-900">
                        Choose one recipient
                      </p>
                      <RecipientPicker
                        recipients={eligibleRecipients}
                        selectedRosterId={selectedRecipientId}
                        onSelect={setSelectedRecipientId}
                        filteredOutCount={filteredOutCount}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">
                        Optional note
                      </label>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Anything they should know about this coverage request?"
                        className="min-h-[120px] w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {error ? (
                      <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                      </div>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!selectedRecipientId || loading}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send request"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
