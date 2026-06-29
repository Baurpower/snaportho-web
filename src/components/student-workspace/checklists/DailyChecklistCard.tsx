"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import type {
  StudentWorkspaceChecklistItem,
  StudentWorkspaceChecklistState,
  StudentWorkspaceChecklistTemplate,
  StudentWorkspaceChecklistTemplateScope,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";
import { ChecklistEmptyState } from "@/components/student-workspace/checklists/ChecklistEmptyState";
import { ChecklistTemplatePicker } from "@/components/student-workspace/checklists/ChecklistTemplatePicker";
import { DailyChecklistList } from "@/components/student-workspace/checklists/DailyChecklistList";
import { ChecklistTemplateEditor } from "@/components/student-workspace/checklists/ChecklistTemplateEditor";

function chooseInitialTemplateId(
  templates: StudentWorkspaceChecklistTemplate[],
  currentRotationId: string | null
) {
  return (
    templates.find(
      (template) =>
        template.rotation_id === currentRotationId &&
        template.template_scope === "rotation"
    )?.id ??
    templates.find((template) => template.is_default)?.id ??
    templates.find((template) => template.template_scope === "daily")?.id ??
    templates[0]?.id ??
    null
  );
}

export function DailyChecklistCard({
  profile,
  rotations,
  templates: initialTemplates,
  items: initialItems,
  state: initialState,
  today,
  currentRotationId,
}: {
  profile: StudentWorkspaceProfile;
  rotations: StudentWorkspaceRotation[];
  templates: StudentWorkspaceChecklistTemplate[];
  items: StudentWorkspaceChecklistItem[];
  state: StudentWorkspaceChecklistState[];
  today: string;
  currentRotationId: string | null;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [items, setItems] = useState(initialItems);
  const [state, setState] = useState(initialState);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    chooseInitialTemplateId(initialTemplates, currentRotationId)
  );
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const activeItems = activeTemplate
    ? items.filter((item) => item.template_id === activeTemplate.id)
    : [];
  const stateByItemId = useMemo(
    () => new Map(state.map((entry) => [entry.checklist_item_id, entry])),
    [state]
  );

  async function toggleChecklistItem(
    item: StudentWorkspaceChecklistItem,
    nextCompleted: boolean
  ) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/student-workspace/checklists/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist_item_id: item.id,
          state_date: today,
          is_completed: nextCompleted,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to update checklist item.");
      }
      setState((current) => {
        const next = current.filter(
          (entry) => entry.checklist_item_id !== result.state.checklist_item_id
        );
        return [...next, result.state];
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update checklist item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function createTemplate(values: {
    title: string;
    description: string;
    template_scope: StudentWorkspaceChecklistTemplateScope;
    rotation_id: string;
    is_default: boolean;
  }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/student-workspace/checklists/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          rotation_id: values.rotation_id || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to create template.");
      setTemplates((current) => [...current, result.template]);
      setSelectedTemplateId(result.template.id);
      setShowEditor(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create template.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTemplate(
    templateId: string,
    values: {
      title: string;
      description: string;
      template_scope: StudentWorkspaceChecklistTemplateScope;
      rotation_id: string;
      is_default: boolean;
    }
  ) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/student-workspace/checklists/templates/${templateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            rotation_id: values.rotation_id || null,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to update template.");
      setTemplates((current) =>
        current.map((template) =>
          template.id === result.template.id ? result.template : template
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update template.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(templateId: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/student-workspace/checklists/templates/${templateId}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to delete template.");
      setTemplates((current) => current.filter((template) => template.id !== templateId));
      setItems((current) => current.filter((item) => item.template_id !== templateId));
      setSelectedTemplateId((current) =>
        current === templateId
          ? chooseInitialTemplateId(
              templates.filter((template) => template.id !== templateId),
              currentRotationId
            )
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete template.");
    } finally {
      setSaving(false);
    }
  }

  async function createItem(
    templateId: string,
    values: { label: string; details: string; is_required: boolean }
  ) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/student-workspace/checklists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, template_id: templateId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to create checklist item.");
      setItems((current) => [...current, result.item]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create checklist item.");
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(
    itemId: string,
    values: { label: string; details: string; is_required: boolean }
  ) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/student-workspace/checklists/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to update checklist item.");
      setItems((current) =>
        current.map((item) => (item.id === result.item.id ? result.item : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update checklist item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(itemId: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/student-workspace/checklists/items/${itemId}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Unable to delete checklist item.");
      setItems((current) => current.filter((item) => item.id !== itemId));
      setState((current) =>
        current.filter((entry) => entry.checklist_item_id !== itemId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete checklist item.");
    } finally {
      setSaving(false);
    }
  }

  const completionCount = activeItems.filter(
    (item) => stateByItemId.get(item.id)?.is_completed
  ).length;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Daily Checklist
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            What needs to happen today?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {profile.display_name
              ? `${profile.display_name}, keep your essentials visible and easy to tap through.`
              : "Keep your essentials visible and easy to tap through."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowEditor((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          <Settings2 className="h-4 w-4" />
          {showEditor ? "Hide editor" : "Edit templates"}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {templates.length === 0 ? (
          <ChecklistEmptyState onCreateTemplate={() => setShowEditor(true)} />
        ) : (
          <>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ChecklistTemplatePicker
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onChange={(templateId) => setSelectedTemplateId(templateId)}
              />
              <div className="text-sm text-slate-600">
                {activeTemplate ? (
                  <>
                    <span className="font-semibold text-slate-900">
                      {completionCount} of {activeItems.length}
                    </span>{" "}
                    complete today.
                  </>
                ) : (
                  "Choose a template to get started."
                )}
              </div>
            </div>

            {activeTemplate ? (
              <DailyChecklistList
                items={activeItems}
                stateByItemId={stateByItemId}
                busy={saving}
                onToggle={toggleChecklistItem}
              />
            ) : null}
          </>
        )}

        {showEditor ? (
          <ChecklistTemplateEditor
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            items={items}
            rotations={rotations}
            saving={saving}
            error={error}
            onCreateTemplate={createTemplate}
            onUpdateTemplate={updateTemplate}
            onDeleteTemplate={deleteTemplate}
            onCreateItem={createItem}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onClose={() => setShowEditor(false)}
          />
        ) : null}

        {error && !showEditor ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
