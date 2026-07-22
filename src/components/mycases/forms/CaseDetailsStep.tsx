"use client";

import type { MyCasesCaseStatus } from "@/lib/mycases/types";

export type CaseDetailsValues = {
  title: string;
  procedure: string;
  diagnosis: string;
  rotation: string;
  attending: string;
  status: MyCasesCaseStatus;
  difficulty: string;
  autonomy: string;
  preparation: string;
  debrief: string;
  tags: string;
};

export const EMPTY_CASE_DETAILS: CaseDetailsValues = {
  title: "",
  procedure: "",
  diagnosis: "",
  rotation: "",
  attending: "",
  status: "draft",
  difficulty: "",
  autonomy: "",
  preparation: "",
  debrief: "",
  tags: "",
};

export type CaseDetailsErrors = Partial<Record<keyof CaseDetailsValues, string>>;

export function validateCaseDetails(values: CaseDetailsValues): CaseDetailsErrors {
  const errors: CaseDetailsErrors = {};
  if (!values.title.trim()) errors.title = "Enter a case title.";
  if (!values.procedure.trim()) errors.procedure = "Enter a procedure.";
  if (values.title.trim().length > 160) errors.title = "Case title must be 160 characters or fewer.";
  if (values.procedure.trim().length > 160) errors.procedure = "Procedure must be 160 characters or fewer.";
  for (const name of ["diagnosis", "rotation", "attending"] as const) {
    if (values[name].trim().length > 160) errors[name] = "Use 160 characters or fewer.";
  }
  for (const name of ["preparation", "debrief"] as const) {
    if (values[name].trim().length > 10_000) errors[name] = "Use 10,000 characters or fewer.";
  }
  const tags = values.tags.split(",").map((value) => value.trim()).filter(Boolean);
  if (tags.length > 20) errors.tags = "Add no more than 20 tags.";
  else if (tags.some((value) => value.length > 40)) errors.tags = "Each tag must be 40 characters or fewer.";
  return errors;
}

export function CaseDetailsStep({ values, errors, onChange }: {
  values: CaseDetailsValues;
  errors: CaseDetailsErrors;
  onChange: (name: keyof CaseDetailsValues, value: string) => void;
}) {
  return <div className="space-y-7">
    <section aria-labelledby="case-identity-heading">
      <div className="mb-4">
        <h3 id="case-identity-heading" className="text-sm font-black uppercase tracking-[.14em] text-slate-800">Case identity</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Use generic educational context only—never patient or encounter information.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="title" label="Case title" required maxLength={160} value={values.title} error={errors.title} onChange={onChange}/>
        <Field name="procedure" label="Procedure" required maxLength={160} value={values.procedure} error={errors.procedure} onChange={onChange}/>
        <Field name="diagnosis" label="Generic diagnosis" maxLength={160} value={values.diagnosis} error={errors.diagnosis} onChange={onChange}/>
        <Field name="rotation" label="Rotation" maxLength={160} value={values.rotation} error={errors.rotation} onChange={onChange}/>
        <Field name="attending" label="Attending context" maxLength={160} value={values.attending} error={errors.attending} onChange={onChange}/>
        <SelectField name="status" label="Status" value={values.status} onChange={onChange} options={[
          ["draft", "Draft"], ["upcoming", "Upcoming"], ["completed", "Completed"],
        ]}/>
      </div>
    </section>

    <section aria-labelledby="case-reflection-heading" className="border-t border-slate-200 pt-6">
      <h3 id="case-reflection-heading" className="text-sm font-black uppercase tracking-[.14em] text-slate-800">Learning context</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SelectField name="difficulty" label="Difficulty (0–5)" value={values.difficulty} onChange={onChange} options={ratingOptions}/>
        <SelectField name="autonomy" label="Autonomy (0–5)" value={values.autonomy} onChange={onChange} options={ratingOptions}/>
        <TextArea name="preparation" label="Preparation" value={values.preparation} error={errors.preparation} onChange={onChange}/>
        <TextArea name="debrief" label="Debrief" value={values.debrief} error={errors.debrief} onChange={onChange}/>
        <div className="sm:col-span-2"><Field name="tags" label="Tags (comma separated)" value={values.tags} error={errors.tags} onChange={onChange}/></div>
      </div>
    </section>
  </div>;
}

const ratingOptions: [string, string][] = [["", "Not recorded"], ...[0, 1, 2, 3, 4, 5].map((value) => [String(value), String(value)] as [string, string])];

function Field({ name, label, value, required = false, maxLength, error, onChange }: {
  name: keyof CaseDetailsValues;
  label: string;
  value: string;
  required?: boolean;
  maxLength?: number;
  error?: string;
  onChange: (name: keyof CaseDetailsValues, value: string) => void;
}) {
  const id = `case-${name}`;
  const errorId = `${id}-error`;
  return <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
    {label}{required && <span aria-hidden="true" className="ml-1 text-red-600">*</span>}
    <input id={id} name={name} value={value} required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(name, event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 aria-[invalid=true]:border-red-500"/>
    {error && <span id={errorId} className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
  </label>;
}

function TextArea({ name, label, value, error, onChange }: {
  name: "preparation" | "debrief";
  label: string;
  value: string;
  error?: string;
  onChange: (name: keyof CaseDetailsValues, value: string) => void;
}) {
  const errorId = `case-${name}-error`;
  return <label htmlFor={`case-${name}`} className="block text-sm font-semibold text-slate-800">
    {label}
    <textarea id={`case-${name}`} name={name} rows={4} maxLength={10_000} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(name, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 aria-[invalid=true]:border-red-500"/>
    {error && <span id={errorId} className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
  </label>;
}

function SelectField({ name, label, value, options, onChange }: {
  name: "status" | "difficulty" | "autonomy";
  label: string;
  value: string;
  options: [string, string][];
  onChange: (name: keyof CaseDetailsValues, value: string) => void;
}) {
  return <label htmlFor={`case-${name}`} className="block text-sm font-semibold text-slate-800">
    {label}
    <select id={`case-${name}`} name={name} value={value} onChange={(event) => onChange(name, event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  </label>;
}
