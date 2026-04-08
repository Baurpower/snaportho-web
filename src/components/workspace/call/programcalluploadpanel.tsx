"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Loader2,
  StickyNote,
  Upload,
} from "lucide-react";

export type ParsedProgramCallRow = {
  tempId: string;
  sourceRow: number;
  residentName: string;
  callDate: string | null;
  callType: "Primary" | "Backup";
  site: string | null;
  isHomeCall: boolean;
  notes: string | null;
  errors: string[];
  matchedMembershipId: string | null;
  matchedDisplayName: string | null;
  matchedTrainingLevel: string | null;
  matchedClassYear: number | null;
  status: "matched" | "unmatched" | "needs_review";
};

export type ParsedProgramCallPayload = {
  fileName: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  needsReviewRows: number;
  rows: ParsedProgramCallRow[];
};

type ProgramCallUploadPanelProps = {
  onUploadSuccess?: () => void;
};

export default function ProgramCallUploadPanel({
  onUploadSuccess,
}: ProgramCallUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [notes, setNotes] = useState("");

  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProgramCallPayload | null>(null);

  const matchedCount = useMemo(
    () => parsed?.rows.filter((row) => row.status === "matched").length ?? 0,
    [parsed]
  );

  const unmatchedCount = useMemo(
    () => parsed?.rows.filter((row) => row.status !== "matched").length ?? 0,
    [parsed]
  );

  async function handleParse() {
    try {
      setError(null);

      if (!selectedFile) {
        setError("Choose a file first.");
        return;
      }

      setParsing(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/program/calls/parse", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to parse file");
      }

      setParsed(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  async function handleUploadParsed() {
    try {
      setError(null);

      if (!parsed) {
        setError("Parse a file before uploading.");
        return;
      }

      const unresolvedRows = parsed.rows.filter((row) => row.status !== "matched");
      if (unresolvedRows.length > 0) {
        setError("Resolve unmatched or invalid rows before uploading.");
        return;
      }

      setSaving(true);

      const response = await fetch("/api/program/calls/bulk", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: uploadName.trim() || null,
          notes: notes.trim() || null,
          rows: parsed.rows.map((row) => ({
            residentName: row.residentName,
            callDate: row.callDate!,
            callType: row.callType,
            site: row.site,
            isHomeCall: row.isHomeCall,
            notes: row.notes,
            matchedMembershipId: row.matchedMembershipId,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to upload parsed schedule");
      }

      setSelectedFile(null);
      setParsed(null);
      setUploadName("");
      setNotes("");

      onUploadSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload parsed schedule"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 px-5 py-5 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Upload Instead
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Import an existing call schedule
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          If you already built the schedule elsewhere, upload it here and review
          the parsed resident matches before saving.
        </p>
      </div>

      <div className="p-5 md:p-6">
        <label className="block">
          <div className="rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center transition hover:border-sky-300 hover:bg-sky-50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
              <Upload className="h-6 w-6" />
            </div>

            <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
              Drop a schedule file here
            </h3>
            <p className="mt-2 text-sm text-slate-500">CSV, XLSX, XLS, or PDF.</p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              <FileUp className="h-4 w-4" />
              Choose file
            </div>

            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedFile(file);
                setParsed(null);
                setError(null);

                if (file && !uploadName.trim()) {
                  setUploadName(file.name.replace(/\.[^/.]+$/, ""));
                }
              }}
            />
          </div>
        </label>

        {selectedFile ? (
          <div className="mt-5 rounded-[1rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays className="h-4 w-4" />
              Upload label
            </span>
            <input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="April 2026 Call Schedule"
              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <StickyNote className="h-4 w-4" />
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this uploaded call schedule"
              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleParse}
            disabled={!selectedFile || parsing}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {parsing ? "Parsing..." : "Parse File"}
          </button>

          <button
            type="button"
            onClick={handleUploadParsed}
            disabled={!parsed || unmatchedCount > 0 || saving}
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {saving ? "Uploading..." : "Upload Parsed Schedule"}
          </button>
        </div>

        {parsed ? (
          <div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {parsed.totalRows} parsed
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {matchedCount} matched
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                {unmatchedCount} need review
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[940px] overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
                <div className="grid grid-cols-[100px_1.15fr_130px_110px_150px_100px_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <div>Source</div>
                  <div>Resident</div>
                  <div>Date</div>
                  <div>Type</div>
                  <div>Match</div>
                  <div>Home</div>
                  <div>Notes</div>
                </div>

                {parsed.rows.map((row) => (
                  <div
                    key={row.tempId}
                    className="grid grid-cols-[100px_1.15fr_130px_110px_150px_100px_1fr] items-start border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                  >
                    <div className="text-slate-500">Row {row.sourceRow}</div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {row.residentName || "—"}
                      </p>
                      {row.site ? (
                        <p className="mt-1 text-xs text-slate-500">{row.site}</p>
                      ) : null}
                    </div>

                    <div className="text-slate-700">{row.callDate ?? "—"}</div>

                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.callType === "Primary"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-violet-50 text-violet-700"
                        }`}
                      >
                        {row.callType}
                      </span>
                    </div>

                    <div>
                      {row.status === "matched" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {row.matchedDisplayName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Review
                        </span>
                      )}

                      {row.errors.length > 0 ? (
                        <p className="mt-1 text-xs text-rose-600">
                          {row.errors.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-slate-700">
                      {row.isHomeCall ? "Yes" : "No"}
                    </div>

                    <div className="text-slate-600">{row.notes ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}