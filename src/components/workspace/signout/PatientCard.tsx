"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  Trash2,
  ArchiveRestore,
  CircleCheckBig,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  X,
  Square,
  CheckSquare,
  Pencil,
} from "lucide-react";

import type {
  PatientIdentifiers,
  SignoutCard,
  SignoutManagementMode,
  UpdateCardPatch,
} from "@/lib/workspace/signout/types";
import type { SaveCardResult } from "@/components/workspace/signout/api";
import { IdentityPanel } from "@/components/workspace/signout/IdentityPanel";
import { DraftPanel } from "@/components/workspace/signout/DraftPanel";
import { DiagnosticsPanel, DiagnosticsSummary } from "@/components/workspace/signout/DiagnosticsPanel";
import { SEVERITY_META, nextSeverity } from "@/components/workspace/signout/severity";
import { SmartBody } from "@/components/workspace/signout/SmartBody";
import { toggleCheckboxAt } from "@/lib/workspace/signout/tokens";
import {
  computeNextOr,
  computePod,
  computeTxDay,
  shortDate,
} from "@/lib/workspace/signout/pod";
import {
  serializeFields,
  serializeTodoLines,
  splitFields,
  parseTodoLines,
  DEFAULT_PREOP_ITEMS,
  type SignoutFields,
  type TodoItem,
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

/** Resolve management mode for the editor (explicit facet, else light inference). */
export function resolveManagementMode(card: Pick<
  SignoutCard,
  "managementMode" | "surgeryDate" | "surgery"
>): SignoutManagementMode {
  if (card.managementMode === "surgery" || card.managementMode === "nonop") {
    return card.managementMode;
  }
  if (card.surgeryDate) return "surgery";
  if (card.surgery.trim()) return "nonop";
  return "surgery";
}

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
  const [nextSurgeryDraft, setNextSurgeryDraft] = useState(card.nextSurgery);
  const [nextSurgeryDateDraft, setNextSurgeryDateDraft] = useState(card.nextSurgeryDate);
  const [managementMode, setManagementMode] = useState<SignoutManagementMode>(() =>
    resolveManagementMode(card)
  );
  const [todoItems, setTodoItems] = useState<TodoItem[]>(() =>
    parseTodoLines(splitFields(card.body).values["To-do"] ?? "")
  );
  const [newTodo, setNewTodo] = useState("");
  const [dispoBarriers, setDispoBarriers] = useState<TodoItem[]>(() =>
    parseTodoLines(splitFields(card.body).values["Dispo barriers"] ?? "")
  );
  const [newDispoBarrier, setNewDispoBarrier] = useState("");
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState(card.handle);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "conflict" | "error">(
    "idle"
  );

  const dirtyRef = useRef(false);
  const bodyRevisionRef = useRef(0);
  const saveRequestRef = useRef(0);
  const draftRef = useRef(draft);
  const savedBodyRef = useRef(card.body);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  draftRef.current = draft;

  const meta = SEVERITY_META[card.severity];
  const discharged = card.status === "discharged";
  const isNonop = resolveManagementMode(card) === "nonop";

  // Adopt an externally-changed card (e.g. after a conflict reload) unless the
  // user has unsaved local edits in flight.
  useEffect(() => {
    savedBodyRef.current = card.body;
    if (!dirtyRef.current && !editing) setDraft(card.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.version]);

  async function persist(patch: UpdateCardPatch) {
    const requestId = ++saveRequestRef.current;
    const bodyRevision = patch.body === undefined ? null : bodyRevisionRef.current;
    setStatus("saving");
    try {
      const result = await onSave(patch);
      if (result.ok) {
        if (patch.body !== undefined) {
          savedBodyRef.current = result.card.body;
          // A save finishing must not mark text typed after it began as clean.
          if (
            bodyRevision === bodyRevisionRef.current &&
            draftRef.current === result.card.body
          ) {
            dirtyRef.current = false;
          }
        }
        if (requestId === saveRequestRef.current) setStatus("saved");
        window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
      } else {
        // Preserve the local draft. A collaborator may have changed the server
        // version, but silently replacing in-progress clinical text is unsafe.
        if (requestId === saveRequestRef.current) setStatus("conflict");
      }
    } catch {
      if (requestId === saveRequestRef.current) setStatus("error");
    }
  }

  function scheduleBodySave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (draftRef.current !== savedBodyRef.current) void persist({ body: draftRef.current });
    }, AUTOSAVE_MS);
  }

  function flushBodySave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (draftRef.current !== savedBodyRef.current) void persist({ body: draftRef.current });
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Enter the structured editor, seeding fields from the current body.
  function enterEdit() {
    const next = splitFields(draftRef.current);
    setFields(next);
    setTodoItems(parseTodoLines(next.values["To-do"] ?? ""));
    setNewTodo("");
    setDispoBarriers(parseTodoLines(next.values["Dispo barriers"] ?? ""));
    setNewDispoBarrier("");
    setAttendingDraft(card.attending);
    setLocationDraft(card.location);
    setSurgeryDraft(card.surgery);
    setSurgeryDateDraft(card.surgeryDate);
    setNextSurgeryDraft(card.nextSurgery);
    setNextSurgeryDateDraft(card.nextSurgeryDate);
    setManagementMode(resolveManagementMode(card));
    setEditing(true);
  }

  // Apply a field edit: reserialize the body and schedule an autosave.
  function applyFields(next: SignoutFields) {
    setFields(next);
    const body = serializeFields(next);
    setDraft(body);
    draftRef.current = body;
    bodyRevisionRef.current += 1;
    dirtyRef.current = true;
    scheduleBodySave();
  }

  const updateLead = (value: string) => applyFields({ ...fields, lead: value });
  const updateField = (title: string, value: string) =>
    applyFields({ ...fields, values: { ...fields.values, [title]: value } });

  function applyTodos(items: TodoItem[]) {
    setTodoItems(items);
    updateField("To-do", serializeTodoLines(items));
  }

  function applyDispoBarriers(items: TodoItem[]) {
    setDispoBarriers(items);
    updateField("Dispo barriers", serializeTodoLines(items));
  }

  function applyPreopItems(items: TodoItem[]) {
    const current = splitFields(draftRef.current);
    current.values["Pre-op checklist"] = serializeTodoLines(items);
    const body = serializeFields(current);
    setFields(current);
    setDraft(body);
    draftRef.current = body;
    bodyRevisionRef.current += 1;
    dirtyRef.current = true;
    void persist({ body });
  }

  function saveAttending() {
    if (attendingDraft.trim() !== card.attending) void persist({ attending: attendingDraft });
  }
  function saveLocation() {
    if (locationDraft.trim() !== card.location) void persist({ location: locationDraft });
  }

  async function saveHandle() {
    const handle = handleDraft.trim();
    if (!handle) {
      setHandleDraft(card.handle);
      setEditingHandle(false);
      return;
    }
    if (handle !== card.handle) await persist({ handle });
    setEditingHandle(false);
  }
  function saveSurgery() {
    if (surgeryDraft.trim() !== card.surgery) void persist({ surgery: surgeryDraft });
  }
  function saveSurgeryDate(value: string) {
    setSurgeryDateDraft(value);
    if (value !== card.surgeryDate) void persist({ surgeryDate: value });
  }
  function saveNextSurgery() {
    if (nextSurgeryDraft.trim() !== card.nextSurgery) {
      void persist({ nextSurgery: nextSurgeryDraft });
    }
  }
  function saveNextSurgeryDate(value: string) {
    setNextSurgeryDateDraft(value);
    if (value !== card.nextSurgeryDate) void persist({ nextSurgeryDate: value });
  }

  function setMode(mode: SignoutManagementMode) {
    if (mode === managementMode) return;
    setManagementMode(mode);
    // Keep surgeryDate — it means surgery date or non-op start date depending on mode.
    // Clear planned next OR when leaving surgery pathway.
    if (mode === "nonop") {
      setNextSurgeryDraft("");
      setNextSurgeryDateDraft("");
      void persist({
        managementMode: "nonop",
        nextSurgery: "",
        nextSurgeryDate: "",
      });
      return;
    }
    void persist({ managementMode: mode });
  }

  // Toggle an action-item checkbox from the rendered (non-editing) view.
  function toggleChecklist(lineIndex: number) {
    const next = toggleCheckboxAt(draftRef.current, lineIndex);
    setDraft(next);
    draftRef.current = next;
    bodyRevisionRef.current += 1;
    dirtyRef.current = true;
    void persist({ body: next });
  }

  const podInfo = isNonop ? null : computePod(card.surgeryDate);
  const nextOrInfo = isNonop ? null : computeNextOr(card.nextSurgeryDate);
  const txDayInfo = isNonop ? computeTxDay(card.surgeryDate) : null;
  const showProcedureLine =
    Boolean(
      card.surgery ||
        card.surgeryDate ||
        (!isNonop && (card.nextSurgery || card.nextSurgeryDate))
    ) && !editing;
  const showPreopChecklist =
    !isNonop &&
    Boolean(card.nextSurgery || card.nextSurgeryDate) &&
    (!nextOrInfo || nextOrInfo.upcoming);
  const savedPreopItems = parseTodoLines(
    splitFields(draft).values["Pre-op checklist"] ?? ""
  );
  const preopItems = savedPreopItems.length
    ? savedPreopItems
    : DEFAULT_PREOP_ITEMS.map((item) => ({ ...item }));

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
            {editingHandle ? (
              <input
                autoFocus
                aria-label="Patient label"
                value={handleDraft}
                maxLength={40}
                onChange={(e) => setHandleDraft(e.target.value)}
                onBlur={() => void saveHandle()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") {
                    setHandleDraft(card.handle);
                    setEditingHandle(false);
                  }
                }}
                className="min-w-0 max-w-56 rounded border border-blue-300 px-2 py-0.5 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setHandleDraft(card.handle);
                  setEditingHandle(true);
                }}
                className="group flex min-w-0 items-center gap-1 rounded px-1 text-left hover:bg-slate-100"
                title="Edit patient label"
              >
                <span className="truncate text-base font-bold text-slate-900">{card.handle}</span>
                <Pencil className="h-3 w-3 shrink-0 text-slate-300 group-hover:text-slate-600" />
              </button>
            )}
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
            {nextOrInfo && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  nextOrInfo.upcoming
                    ? "bg-purple-50 text-purple-800"
                    : "bg-indigo-50 text-indigo-800"
                }`}
                title={
                  card.nextSurgeryDate
                    ? `${card.nextSurgery || "Next OR"} · ${shortDate(card.nextSurgeryDate)}`
                    : undefined
                }
              >
                {nextOrInfo.label}
              </span>
            )}
            {isNonop && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                Non-op
              </span>
            )}
            {txDayInfo && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  txDayInfo.started
                    ? "bg-teal-50 text-teal-800"
                    : "bg-slate-100 text-slate-600"
                }`}
                title={
                  card.surgeryDate
                    ? `Started ${shortDate(card.surgeryDate)}`
                    : undefined
                }
              >
                {txDayInfo.label}
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

        {showProcedureLine && (
          <p className="mt-0.5 pl-6 text-xs text-slate-500">
            {isNonop ? (
              <>
                {card.surgery || "Non-op"}
                {card.surgeryDate ? (
                  <>
                    {" · since "}
                    {shortDate(card.surgeryDate)}
                    {txDayInfo ? ` · ${txDayInfo.label}` : ""}
                  </>
                ) : null}
              </>
            ) : (
              <>
                {card.surgery}
                {card.surgery && card.surgeryDate ? " · " : ""}
                {shortDate(card.surgeryDate)}
                {(card.nextSurgery || card.nextSurgeryDate) && (
                  <>
                    {" · → "}
                    {card.nextSurgery || "Next OR"}
                    {card.nextSurgeryDate ? ` ${shortDate(card.nextSurgeryDate)}` : ""}
                  </>
                )}
              </>
            )}
          </p>
        )}

        {showPreopChecklist && !editing && (
          <PreopChecklist items={preopItems} onChange={applyPreopItems} />
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

                <FieldBox label="Management">
                  <div
                    className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5"
                    role="group"
                    aria-label="Management pathway"
                  >
                    <ModeButton
                      active={managementMode === "surgery"}
                      onClick={() => setMode("surgery")}
                      label="Surgery"
                    />
                    <ModeButton
                      active={managementMode === "nonop"}
                      onClick={() => setMode("nonop")}
                      label="Non-op"
                    />
                  </div>
                </FieldBox>

                {managementMode === "surgery" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <FieldBox label="Last surgery">
                        <input
                          value={surgeryDraft}
                          onChange={(e) => setSurgeryDraft(e.target.value)}
                          onBlur={saveSurgery}
                          placeholder="e.g. lower extremity I&D"
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
                    <div className="grid grid-cols-2 gap-2">
                      <FieldBox label="Next OR (optional)">
                        <input
                          value={nextSurgeryDraft}
                          onChange={(e) => setNextSurgeryDraft(e.target.value)}
                          onBlur={saveNextSurgery}
                          placeholder="e.g. repeat I&D + vac change"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                        />
                      </FieldBox>
                      <FieldBox
                        label={
                          nextSurgeryDateDraft && computeNextOr(nextSurgeryDateDraft)
                            ? `Planned date (${computeNextOr(nextSurgeryDateDraft)!.label})`
                            : "Planned date (countdown auto-calcs)"
                        }
                      >
                        <input
                          type="date"
                          value={nextSurgeryDateDraft}
                          onChange={(e) => saveNextSurgeryDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                        />
                      </FieldBox>
                    </div>
                    {showPreopChecklist && (
                      <PreopChecklist items={preopItems} onChange={applyPreopItems} />
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <FieldBox label="Tx">
                      <input
                        value={surgeryDraft}
                        onChange={(e) => setSurgeryDraft(e.target.value)}
                        onBlur={saveSurgery}
                        placeholder="e.g. IV ABX, NWB cast"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                      />
                    </FieldBox>
                    <FieldBox
                      label={
                        surgeryDateDraft && computeTxDay(surgeryDateDraft)
                          ? `Started (${computeTxDay(surgeryDateDraft)!.label})`
                          : "Started (days since auto-calcs)"
                      }
                    >
                      <input
                        type="date"
                        value={surgeryDateDraft}
                        onChange={(e) => saveSurgeryDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-400"
                      />
                    </FieldBox>
                  </div>
                )}

                <FieldBox label="One-liner">
                  <AutoTextarea
                    value={fields.lead}
                    onChange={updateLead}
                    placeholder="25M left index felon s/p bedside I&D 8/1 · NWB"
                    minRows={2}
                  />
                </FieldBox>

                <FieldBox label="HPI / Exam">
                  <AutoTextarea
                    value={fields.values["HPI/Exam"] ?? ""}
                    onChange={(v) => updateField("HPI/Exam", v)}
                    placeholder="One-liner history, interval events, exam findings…"
                  />
                </FieldBox>

                <FieldBox label="Paste / freeform diagnostics">
                  <AutoTextarea
                    value={fields.values["Labs/Imaging/PT"] ?? ""}
                    onChange={(v) => updateField("Labs/Imaging/PT", v)}
                    placeholder="Paste an update or keep any notes that do not need tracking…"
                  />
                </FieldBox>

                <DiagnosticsPanel
                  diagnostics={card.diagnostics}
                  onChange={(diagnostics) => void persist({ diagnostics })}
                />

                <FieldBox label="Plan">
                  <AutoTextarea
                    value={fields.values["Plan"] ?? ""}
                    onChange={(v) => updateField("Plan", v)}
                    placeholder="Clinical plan — what we’re doing overnight / next steps…"
                  />
                </FieldBox>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-900">
                    Disposition
                  </p>
                  <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <FieldBox label="Destination / status">
                      <AutoTextarea
                        value={fields.values["Dispo"] ?? ""}
                        onChange={(v) => updateField("Dispo", v)}
                        placeholder="Home pending PT; SNF referrals sent"
                        minRows={1}
                      />
                    </FieldBox>
                    <FieldBox label="Before sign-off">
                      <TodoEditor
                        items={dispoBarriers}
                        onChange={applyDispoBarriers}
                        newTodo={newDispoBarrier}
                        setNewTodo={setNewDispoBarrier}
                        placeholder="Add barrier…"
                      />
                    </FieldBox>
                  </div>
                </div>

                <FieldBox label="To-do">
                  <TodoEditor
                    items={todoItems}
                    onChange={applyTodos}
                    newTodo={newTodo}
                    setNewTodo={setNewTodo}
                  />
                </FieldBox>

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
              <>
                <SmartBody
                  text={draft}
                  onToggleCheckbox={toggleChecklist}
                  onRequestEdit={enterEdit}
                />
                <DiagnosticsSummary diagnostics={card.diagnostics} onEdit={enterEdit} />
              </>
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
                  aria-label={discharged ? "Restore to active list" : "Move to signed off"}
                  title={discharged ? "Restore to active list" : "Move to signed off"}
                  onClick={() =>
                    void persist({ status: discharged ? "active" : "discharged" })
                  }
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                    discharged
                      ? "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {discharged ? (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  ) : (
                    <CircleCheckBig className="h-3.5 w-3.5" />
                  )}
                  {discharged ? "Restore" : "Sign off"}
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

            <DraftPanel
              card={{ ...card, body: draft }}
              hasIdentifiers={card.hasIdentifiers}
              onReveal={onRevealIdentity}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PreopChecklist({
  items,
  onChange,
}: {
  items: TodoItem[];
  onChange: (items: TodoItem[]) => void;
}) {
  const complete = items.filter((item) => item.checked).length;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-1.5 text-xs">
      <span className="mr-0.5 font-bold uppercase tracking-wide text-purple-900">Pre-op</span>
      {items.map((item, index) => (
        <button
          key={`${item.text}-${index}`}
          type="button"
          aria-pressed={item.checked}
          onClick={(event) => {
            event.stopPropagation();
            const next = items.map((candidate, itemIndex) =>
              itemIndex === index ? { ...candidate, checked: !candidate.checked } : candidate
            );
            onChange(next);
          }}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold transition-colors ${
            item.checked
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-purple-200 bg-white text-purple-800 hover:bg-purple-100"
          }`}
        >
          {item.checked ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {item.text}
        </button>
      ))}
      <span className="ml-auto text-[10px] font-semibold text-purple-700/70">
        {complete}/{items.length}
      </span>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-600 hover:bg-white hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function TodoEditor({
  items,
  onChange,
  newTodo,
  setNewTodo,
  placeholder = "Add overnight task…",
}: {
  items: TodoItem[];
  onChange: (items: TodoItem[]) => void;
  newTodo: string;
  setNewTodo: (v: string) => void;
  placeholder?: string;
}) {
  function addItem() {
    const text = newTodo.trim();
    if (!text) return;
    onChange([...items, { checked: false, text }]);
    setNewTodo("");
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white">
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-1.5 px-2 py-1.5">
              <button
                type="button"
                aria-label={item.checked ? "Mark incomplete" : "Mark done"}
                onClick={() => {
                  const next = items.slice();
                  next[index] = { ...item, checked: !item.checked };
                  onChange(next);
                }}
                className={`mt-0.5 shrink-0 ${
                  item.checked ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {item.checked ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <input
                value={item.text}
                onChange={(e) => {
                  const next = items.slice();
                  next[index] = { ...item, text: e.target.value };
                  onChange(next);
                }}
                className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                  item.checked ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              />
              <button
                type="button"
                aria-label="Remove to-do"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="shrink-0 rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 ${
          items.length > 0 ? "border-t border-slate-100" : ""
        }`}
      >
        <Plus className="h-4 w-4 shrink-0 text-slate-300" />
        <input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-0.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newTodo.trim()}
          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function FieldBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </div>
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
