"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistTemplate,
  StudentWorkspaceChecklistTemplateScope,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

type TemplateEditorProps = {
  templates: StudentWorkspaceChecklistTemplate[];
  selectedTemplateId: string | null;
  items: StudentWorkspaceChecklistItem[];
  rotations: StudentWorkspaceRotation[];
  saving: boolean;
  error: string | null;
  onCreateTemplate: (values: {
    title: string;
    description: string;
    template_scope: StudentWorkspaceChecklistTemplateScope;
    rotation_id: string;
    is_default: boolean;
  }) => Promise<void>;
  onUpdateTemplate: (
    templateId: string,
    values: {
      title: string;
      description: string;
      template_scope: StudentWorkspaceChecklistTemplateScope;
      rotation_id: string;
      is_default: boolean;
    }
  ) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onCreateItem: (
    templateId: string,
    values: { label: string; details: string; is_required: boolean }
  ) => Promise<void>;
  onUpdateItem: (
    itemId: string,
    values: { label: string; details: string; is_required: boolean }
  ) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onClose: () => void;
};

export function ChecklistTemplateEditor({
  templates,
  selectedTemplateId,
  items,
  rotations,
  saving,
  error,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onClose,
}: TemplateEditorProps) {
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedItems = selectedTemplate
    ? items.filter((item) => item.template_id === selectedTemplate.id)
    : [];

  async function handleTemplateCreate(formData: FormData) {
    await onCreateTemplate({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      template_scope: String(
        formData.get("template_scope") ?? "daily"
      ) as StudentWorkspaceChecklistTemplateScope,
      rotation_id: String(formData.get("rotation_id") ?? ""),
      is_default: formData.get("is_default") === "on",
    });
  }

  async function handleTemplateUpdate(formData: FormData) {
    if (!selectedTemplate) return;
    await onUpdateTemplate(selectedTemplate.id, {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      template_scope: String(
        formData.get("template_scope") ?? "daily"
      ) as StudentWorkspaceChecklistTemplateScope,
      rotation_id: String(formData.get("rotation_id") ?? ""),
      is_default: formData.get("is_default") === "on",
    });
  }

  async function handleNewItem(formData: FormData) {
    if (!selectedTemplate) return;
    await onCreateItem(selectedTemplate.id, {
      label: String(formData.get("label") ?? ""),
      details: String(formData.get("details") ?? ""),
      is_required: formData.get("is_required") === "on",
    });
  }

  return (
    <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Checklist Editor
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            Manage templates and items
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          Done
        </button>
      </div>

      <form action={handleTemplateCreate} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Create template</p>
        <input name="title" placeholder="Template title" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none" />
        <textarea name="description" placeholder="Short description" rows={2} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none" />
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="template_scope" defaultValue="daily" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none">
            <option value="daily">daily</option>
            <option value="rotation">rotation</option>
            <option value="away_rotation">away_rotation</option>
          </select>
          <select name="rotation_id" defaultValue="" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none">
            <option value="">No linked rotation</option>
            {rotations.map((rotation) => (
              <option key={rotation.id} value={rotation.id}>
                {rotation.title}
              </option>
            ))}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="is_default" className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
          Default template
        </label>
        <button type="submit" disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
          <Plus className="h-4 w-4" />
          Create template
        </button>
      </form>

      {selectedTemplate ? (
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <form action={handleTemplateUpdate} className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Edit selected template</p>
              <button
                type="button"
                onClick={() => onDeleteTemplate(selectedTemplate.id)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete template
              </button>
            </div>
            <input name="title" defaultValue={selectedTemplate.title} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none" />
            <textarea name="description" defaultValue={selectedTemplate.description ?? ""} rows={2} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="template_scope" defaultValue={selectedTemplate.template_scope} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none">
                <option value="daily">daily</option>
                <option value="rotation">rotation</option>
                <option value="away_rotation">away_rotation</option>
              </select>
              <select name="rotation_id" defaultValue={selectedTemplate.rotation_id ?? ""} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none">
                <option value="">No linked rotation</option>
                {rotations.map((rotation) => (
                  <option key={rotation.id} value={rotation.id}>
                    {rotation.title}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="is_default" defaultChecked={selectedTemplate.is_default} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
              Default template
            </label>
            <button type="submit" disabled={saving} className="inline-flex w-fit items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60">
              Save template changes
            </button>
          </form>

          <form action={handleNewItem} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Add item</p>
            <input name="label" placeholder="Checklist item label" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none" />
            <textarea name="details" placeholder="Optional details" rows={2} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none" />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="is_required" className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
              Required item
            </label>
            <button type="submit" disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </form>

          <div className="grid gap-3">
            {selectedItems.map((item) => (
              <ChecklistEditorItem
                key={item.id}
                item={item}
                saving={saving}
                onUpdate={(values) => onUpdateItem(item.id, values)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function ChecklistEditorItem({
  item,
  saving,
  onUpdate,
  onDelete,
}: {
  item: StudentWorkspaceChecklistItem;
  saving: boolean;
  onUpdate: (values: {
    label: string;
    details: string;
    is_required: boolean;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  async function handleSubmit(formData: FormData) {
    await onUpdate({
      label: String(formData.get("label") ?? ""),
      details: String(formData.get("details") ?? ""),
      is_required: formData.get("is_required") === "on",
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input name="label" defaultValue={item.label} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none" />
      <textarea name="details" defaultValue={item.details ?? ""} rows={2} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="is_required" defaultChecked={item.is_required} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
          Required
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60">
            Save item
          </button>
          <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </form>
  );
}
