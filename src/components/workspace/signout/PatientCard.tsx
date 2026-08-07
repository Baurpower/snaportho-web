"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  Trash2,
  ArchiveRestore,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";

import type {
  PatientIdentifiers,
  SignoutCard,
  UpdateCardPatch,
} from "@/lib/workspace/signout/types";
import type { SaveCardResult } from "@/components/workspace/signout/api";
import { IdentityPanel } from "@/components/workspace/signout/IdentityPanel";
import { SEVERITY_META, nextSeverity } from "@/components/workspace/signout/severity";
import { SmartBody } from "@/components/workspace/signout/SmartBody";
import { toggleCheckboxAt } from "@/lib/workspace/signout/tokens";
import { computePod, shortDate } from "@/lib/workspace/signout/pod";
import {
  SIGNOUT_FIELDS,
  serializeFields,
  splitFields,
  type SignoutFields,
} from "@/lib/workspace/signout/fields";

type Props = {
  card: SignoutCard;
  phiEnabled: boolean;
  onSave: (patch: UpdateCardPatch) => Promise<SaveCardResult>;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
  onSaveIdentity: (ids: PatientIdentifiers) => Promise<void>;
  onRevealIdentity: () => Promise<PatientIdentifiers>;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

const AUTOSAVE_MS = 800;

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.trim();
}

function editedTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function PatientCard({
  card,
  phiEnabled,
  onSave,
  onDelete,
  onMove,
  onSaveIdentity,
  onRevealIdentity,
  canMoveUp,
  canMoveDown,
}: Props) {
  const [draft, setDraft] = useState(card.body);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<SignoutFields>(() => splitFields(card.body));
  const [attendingDraft, setAttendingDraft] = useState(card.attending);
  const [locationDraft, setLocationDraft] = useState(card.location);
  const [surgeryDraft, setSurgeryDraft] = useState(card.surgery);
  const [surgeryDateDraft, setSurgeryDateDraft] = useState(card.surgeryDate);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "conflict" | "error">(
    "idle"
  );

  const dirtyRef = useRef(false);
  const draftRef = useRef(draft);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  draftRef.current = draft;

  const meta = SEVERITY_META[card.severity];
  const discharged = card.status === "discharged";

  // Adopt an externally-changed card (e.g. after a conflict reload) unless the
  // user has unsaved local edits in flight.
  useEffect(() => {
    if (!dirtyRef.current) setDraft(card.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.version]);

  async function persist(patch: UpdateCardPatch) {
    setStatus("saving");
    try {
      const result = await onSave(patch);
      if (result.ok) {
        if (patch.body !== undefined) dirtyRef.current = false;
        setStatus("saved");
        window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
      } else {
        dirtyRef.current = false; // let the reloaded card sync in
        setStatus("conflict");
      }
    } catch {
      setStatus("error");
    }
  }

  function scheduleBodySave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (draftRef.current !== card.body) void persist({ body: draftRef.current });
    }, AUTOSAVE_MS);
  }

  function flushBodySave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (draftRef.current !== card.body) void persist({ body: draftRef.current });
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Enter the structured editor, seeding fields from the current body.
  function enterEdit() {
    setFields(splitFields(draftRef.current));
    setAttendingDraft(card.attending);
    setLocationDraft(card.location);
    setSurgeryDraft(card.surgery);
    setSurgeryDateDraft(card.surgeryDate);
    setEditing(true);
  }

  // Apply a field edit: reserialize the body and schedule an autosave.
  function applyFields(next: SignoutFields) {
    setFields(next);
    const body = serializeFields(next);
    setDraft(body);
    dirtyRef.current = true;
    scheduleBodySave();
  }

  const updateLead = (value: string) => applyFields({ ...fields, lead: value });
  const updateField = (title: string, value: string) =>
    applyFields({ ...fields, values: { ...fields.values, [title]: value } });

  function saveAttending() {
    if (attendingDraft.trim() !== card.attending) void persist({ attending: attendingDraft });
  }
  function saveLocation() {
    if (locationDraft.trim() !== card.location) void persist({ location: locationDraft });
  }
  function saveSurgery() {
    if (surgeryDraft.trim() !== card.surgery) void persist({ surgery: surgeryDraft });
  }
  function saveSurgeryDate(value: string) {
    setSurgeryDateDraft(value);
    if (value !== card.surgeryDate) void persist({ surgeryDate: value });
  }

  // Toggle an action-item checkbox from the rendered (non-editing) view.
  function toggleChecklist(lineIndex: number) {
    const next = toggleCheckboxAt(draftRef.current, lineIndex);
    setDraft(next);
    dirtyRef.current = true;
    void persist({ body: next });
  }

  const podInfo = computePod(card.surgeryDate);

  return (
    <div
      className={`flex overflow-hidden rounded-xl border bg-white ${
        discharged ? "border-slate-200 opacity-60" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        aria-label={`Severity: ${meta.label}. Click to change.`}
        onClick={() => void persist({ severity: nextSeverity(card.severity) })}
        className={`w-1.5 shrink-0 ${meta.rail}`}
      />
      <div className="flex-1 p-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={card.pinned ? "Unpin" : "Pin to top"}
              onClick={() => void persist({ pinned: !card.pinned })}
              className={`shrink-0 ${card.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
            >
              {card.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>
            <span className="truncate text-base font-bold text-slate-900">
              {card.handle}
            </span>
            {card.location && (
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {card.location}
              </span>
            )}
            {card.attending && (
              <span className="truncate text-xs font-semibold text-slate-500">
                {card.attending}
              </span>
            )}
            <button
              type="button"
              onClick={() => void persist({ severity: nextSeverity(card.severity) })}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}
            >
              {meta.label}
            </button>
            {podInfo && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  podInfo.preOp ? "bg-purple-50 text-purple-800" : "bg-blue-50 text-blue-800"
                }`}
              >
                {podInfo.label}
              </span>
            )}
            {discharged && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                Discharged
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-slate-400">
            <SaveBadge status={status} />
            <button
              type="button"
              aria-label={collapsed ? "Expand" : "Collapse"}
              onClick={() => setCollapsed((c) => !c)}
              className="rounded p-1 hover:bg-slate-100 hover:text-slate-700"
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {(card.surgery || card.surgeryDate) && !editing && (
          <p className="mt-0.5 pl-6 text-xs text-slate-500">
            {card.surgery}
            {card.surgery && card.surgeryDate ? " · " : ""}
            {shortDate(card.surgeryDate)}
          </p>
        )}

        {collapsed ? (
          <p className="mt-1 truncate pl-6 text-sm text-slate-500">
            {firstLine(draft) || "No notes yet"}
          </p>
        ) : (
          <>
            {editing ? (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <FieldBox label="Attending">
                    <input
                      autoFocus
                      value={attendingDraft}
                      onChange={(e) => setAttendingDraft(e.target.value)}
                      onBlur={saveAttending}
                      placeholder="Attending"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                    />
                  </FieldBox>
                  <FieldBox label="Location">
                    <input
                      value={locationDraft}
                      onChange={(e) => setLocationDraft(e.target.value)}
                      onBlur={saveLocation}
                      placeholder="Room / unit"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                    />
                  </FieldBox>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FieldBox label="Surgery">
                    <input
                      value={surgeryDraft}
                      onChange={(e) => setSurgeryDraft(e.target.value)}
                      onBlur={saveSurgery}
                      placeholder="e.g. ORIF R hip"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                    />
                  </FieldBox>
                  <FieldBox label="Surgery date (POD auto-calcs)">
                    <input
                      type="date"
                      value={surgeryDateDraft}
                      onChange={(e) => saveSurgeryDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                    />
                  </FieldBox>
                </div>
                <FieldBox label="One-liner">
                  <AutoTextarea
                    value={fields.lead}
                    onChange={updateLead}
                    placeholder="25M left index felon s/p bedside I&D 8/1 · NWB"
                    minRows={2}
                  />
                </FieldBox>
                {SIGNOUT_FIELDS.map((f) => (
                  <FieldBox key={f.title} label={f.label}>
                    <AutoTextarea
                      value={fields.values[f.title] ?? ""}
                      onChange={(v) => updateField(f.title, v)}
                      placeholder={f.placeholder}
                    />
                  </FieldBox>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    flushBodySave();
                  }}
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <SmartBody
                text={draft}
                onToggleCheckbox={toggleChecklist}
                onRequestEdit={enterEdit}
              />
            )}

            {status === "conflict" && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Someone else edited this — the latest version was loaded.
              </p>
            )}

            {/* Controls */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-500">
              <span className="ml-auto text-[11px] text-slate-400">
                edited {editedTime(card.updatedAt)}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={!canMoveUp}
                  onClick={() => onMove("up")}
                  className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={!canMoveDown}
                  onClick={() => onMove("down")}
                  className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={discharged ? "Mark active" : "Discharge"}
                  title={discharged ? "Mark active" : "Discharge"}
                  onClick={() =>
                    void persist({ status: discharged ? "active" : "discharged" })
                  }
                  className="rounded p-1 hover:bg-slate-100"
                >
                  <ArchiveRestore className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove patient"
                  title="Remove"
                  onClick={onDelete}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {phiEnabled && (
              <IdentityPanel
                hasIdentifiers={card.hasIdentifiers}
                onSave={onSaveIdentity}
                onReveal={onRevealIdentity}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FieldBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const rows = Math.min(10, Math.max(minRows, value.split("\n").length + 1));
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-400"
    />
  );
}

function SaveBadge({ status }: { status: string }) {
  if (status === "saving")
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Saving" />;
  if (status === "saved")
    return <Check className="h-3.5 w-3.5 text-emerald-500" aria-label="Saved" />;
  if (status === "error")
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Save failed" />;
  return null;
}

