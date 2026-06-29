"use client";

import type { StudentWorkspaceChecklistTemplate } from "@/lib/student-workspace/types";

export function ChecklistTemplatePicker({
  templates,
  selectedTemplateId,
  onChange,
}: {
  templates: StudentWorkspaceChecklistTemplate[];
  selectedTemplateId: string | null;
  onChange: (templateId: string) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        Active template
      </span>
      <select
        value={selectedTemplateId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>
    </label>
  );
}
