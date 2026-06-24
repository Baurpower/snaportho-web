"use client";

import { useState } from "react";
import type { ClinicalSection, ClinicalSectionItem } from "@/lib/caseprep-review/types";

interface CasePrepSectionEditorProps {
  section: ClinicalSection;
  onSave: (items: ClinicalSectionItem[]) => Promise<void>;
  onCancel: () => void;
}

// ── Bullet list editor ────────────────────────────────────────────────────────

function BulletListEditor({
  items,
  onChange,
}: {
  items: Array<{ kind: "bullet"; text: string }>;
  onChange: (items: Array<{ kind: "bullet"; text: string }>) => void;
}) {
  const update = (i: number, text: string) => {
    const next = [...items];
    next[i] = { kind: "bullet", text };
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  const add = () => {
    onChange([...items, { kind: "bullet", text: "" }]);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="mt-2.5 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300" />
          <textarea
            rows={2}
            value={item.text}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={() => remove(i)}
            className="mt-1 text-red-400 hover:text-red-600 text-xs font-medium px-1"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
      >
        + Add item
      </button>
    </div>
  );
}

// ── Structures at risk editor ─────────────────────────────────────────────────

type StructureAtRiskItem = Extract<ClinicalSectionItem, { kind: "structure_at_risk" }>;

function StructureAtRiskEditor({
  items,
  onChange,
}: {
  items: StructureAtRiskItem[];
  onChange: (items: StructureAtRiskItem[]) => void;
}) {
  const update = (i: number, field: keyof StructureAtRiskItem, value: string) => {
    const next = items.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    );
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([
      ...items,
      {
        kind: "structure_at_risk",
        structure: "",
        why_at_risk: "",
        how_to_avoid_injury: "",
        consequence_of_injury: "",
        approach_context: null,
        source_urls: [],
      },
    ]);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-red-100 rounded-xl p-4 bg-red-50 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-red-800">Structure {i + 1}</span>
            <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-xs">
              Remove
            </button>
          </div>
          <Field label="Structure name" value={item.structure} onChange={(v) => update(i, "structure", v)} />
          <Field label="Why at risk" value={item.why_at_risk} onChange={(v) => update(i, "why_at_risk", v)} rows={2} />
          <Field label="How to avoid" value={item.how_to_avoid_injury} onChange={(v) => update(i, "how_to_avoid_injury", v)} rows={2} />
          <Field label="If injured" value={item.consequence_of_injury} onChange={(v) => update(i, "consequence_of_injury", v)} rows={2} />
          <Field
            label="Approach context (optional)"
            value={item.approach_context ?? ""}
            onChange={(v) => update(i, "approach_context", v)}
          />
        </div>
      ))}
      <button onClick={add} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
        + Add structure
      </button>
    </div>
  );
}

// ── Surgical layers editor ────────────────────────────────────────────────────

type SurgicalLayerItem = Extract<ClinicalSectionItem, { kind: "surgical_layer" }>;

function SurgicalLayerEditor({
  items,
  onChange,
}: {
  items: SurgicalLayerItem[];
  onChange: (items: SurgicalLayerItem[]) => void;
}) {
  const update = (i: number, field: keyof SurgicalLayerItem, value: unknown) => {
    const next = items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([
      ...items,
      {
        kind: "surgical_layer",
        layer_name: "",
        what_user_should_know: "",
        key_structures: [],
        structures_at_risk: [],
        surgical_relevance: "",
        source_urls: [],
      },
    ]);

  const listToText = (arr: string[]) => arr.join("\n");
  const textToList = (text: string) =>
    text
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-800">Layer {i + 1}</span>
            <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-xs">
              Remove
            </button>
          </div>
          <Field label="Layer name" value={item.layer_name} onChange={(v) => update(i, "layer_name", v)} />
          <Field label="What to know" value={item.what_user_should_know} onChange={(v) => update(i, "what_user_should_know", v)} rows={3} />
          <Field
            label="Key structures (one per line)"
            value={listToText(item.key_structures)}
            onChange={(v) => update(i, "key_structures", textToList(v))}
            rows={3}
          />
          <Field
            label="Structures at risk (one per line)"
            value={listToText(item.structures_at_risk)}
            onChange={(v) => update(i, "structures_at_risk", textToList(v))}
            rows={3}
          />
          <Field label="Surgical relevance" value={item.surgical_relevance} onChange={(v) => update(i, "surgical_relevance", v)} rows={2} />
        </div>
      ))}
      <button onClick={add} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
        + Add layer
      </button>
    </div>
  );
}

// ── Pimp question editor ──────────────────────────────────────────────────────

type PimpItem = Extract<ClinicalSectionItem, { kind: "pimp_question" }>;

function PimpQuestionEditor({
  items,
  onChange,
}: {
  items: PimpItem[];
  onChange: (items: PimpItem[]) => void;
}) {
  const update = (i: number, field: "question" | "answer", value: string) => {
    const next = items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { kind: "pimp_question", question: "", answer: "" }]);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase">Q {i + 1}</span>
            <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-xs">
              Remove
            </button>
          </div>
          <div className="px-4 py-3 space-y-3 bg-white">
            <Field label="Question" value={item.question} onChange={(v) => update(i, "question", v)} rows={2} />
            <Field label="Answer" value={item.answer} onChange={(v) => update(i, "answer", v)} rows={3} />
          </div>
        </div>
      ))}
      <button onClick={add} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
        + Add question
      </button>
    </div>
  );
}

// ── Shared field component ────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
    </div>
  );
}

// ── Main editor component ─────────────────────────────────────────────────────

export function CasePrepSectionEditor({
  section,
  onSave,
  onCancel,
}: CasePrepSectionEditorProps) {
  const [items, setItems] = useState<ClinicalSectionItem[]>(section.items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBulletSection = [
    "indications",
    "setup_positioning",
    "approach_landmarks",
    "pitfalls",
    "postop_plan",
    "implant_strategy",
    "reduction_or_fluoro_checkpoints",
  ].includes(section.key);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (isBulletSection) {
      return (
        <BulletListEditor
          items={items.filter((i) => i.kind === "bullet") as Array<{
            kind: "bullet";
            text: string;
          }>}
          onChange={(updated) => setItems(updated)}
        />
      );
    }
    if (section.key === "structures_at_risk") {
      return (
        <StructureAtRiskEditor
          items={items.filter((i) => i.kind === "structure_at_risk") as StructureAtRiskItem[]}
          onChange={(updated) => setItems(updated)}
        />
      );
    }
    if (section.key === "surgical_layers") {
      return (
        <SurgicalLayerEditor
          items={items.filter((i) => i.kind === "surgical_layer") as SurgicalLayerItem[]}
          onChange={(updated) => setItems(updated)}
        />
      );
    }
    if (section.key === "attending_pimp_questions") {
      return (
        <PimpQuestionEditor
          items={items.filter((i) => i.kind === "pimp_question") as PimpItem[]}
          onChange={(updated) => setItems(updated)}
        />
      );
    }
    return (
      <div className="text-sm text-gray-500 italic py-4">
        Editing is not supported for this section type.
      </div>
    );
  };

  return (
    <div className="space-y-4 border border-indigo-200 rounded-xl p-5 bg-indigo-50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-800">Editing section</span>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {renderEditor()}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
