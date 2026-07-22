"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import type { MyCasesCase, MyCasesCaseInput } from "@/lib/mycases/types";
import { CaseDetailsStep, EMPTY_CASE_DETAILS, validateCaseDetails, type CaseDetailsErrors, type CaseDetailsValues } from "./CaseDetailsStep";
import { CaseMediaStep } from "./CaseMediaStep";
import { useStagedCaseMedia } from "../hooks/useStagedCaseMedia";
import { useCreateCaseWithMedia, type CaseMediaUpload } from "../hooks/useCreateCaseWithMedia";

export function CaseCreateDialog({ close, onOpenCase }: { close: () => void; onOpenCase: (item: MyCasesCase) => Promise<void> | void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState<CaseDetailsValues>(EMPTY_CASE_DETAILS);
  const [detailErrors, setDetailErrors] = useState<CaseDetailsErrors>({});
  const [attested, setAttested] = useState(false);
  const [attestationError, setAttestationError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const requestCloseRef = useRef<() => void>(() => undefined);
  const staged = useStagedCaseMedia();
  const workflow = useCreateCaseWithMedia();

  const requestClose = useCallback(() => {
    if (workflow.busy) return;
    const stagedFiles = staged.items.some((item) => item.file);
    if (stagedFiles) {
      const warning = workflow.createdCase
        ? "The case was created, but closing now will discard the local files still available for retry. Open the case instead?"
        : "Discard this case draft and all locally staged images?";
      if (!window.confirm(warning)) return;
    }
    staged.clear();
    close();
  }, [close, staged, workflow.busy, workflow.createdCase]);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnFocus?.focus();
    };
  }, []);

  useEffect(() => { if (step === 2) stepHeadingRef.current?.focus(); }, [step]);

  const updateDetail = (name: keyof CaseDetailsValues, value: string) => {
    setDetails((current) => ({ ...current, [name]: value } as CaseDetailsValues));
    if (detailErrors[name]) setDetailErrors((current) => ({ ...current, [name]: undefined }));
  };

  const continueToImages = () => {
    const errors = validateCaseDetails(details);
    setDetailErrors(errors);
    if (Object.keys(errors).length) {
      window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    const media = uploadableMedia(staged.items);
    if (media.length && !attested) {
      setAttestationError("Confirm the de-identification statement before continuing.");
      window.setTimeout(() => document.getElementById("case-media-attestation")?.focus());
      return;
    }
    setAttestationError("");
    const result = workflow.createdCase
      ? await workflow.retry(media.filter((item) => item.status === "failed"), attested, staged.setStatus)
      : await workflow.submit(casePayload(details), media, attested, staged.setStatus);
    if (!result) {
      window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("[data-workflow-error]")?.focus());
      return;
    }
    if (result.failedIds.length === 0) {
      staged.clear();
      await onOpenCase(result.caseItem);
    }
  };

  const openCreatedCase = async () => {
    if (!workflow.createdCase || workflow.busy) return;
    staged.clear();
    await onOpenCase(workflow.createdCase);
  };

  const failedCount = staged.items.filter((item) => item.status === "failed" && item.file).length;
  const hasMedia = staged.items.some((item) => item.file);
  return <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="case-create-title" tabIndex={-1} className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[min(900px,calc(100dvh-2rem))] sm:rounded-xl">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Private educational workspace</p>
            <h2 id="case-create-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Add educational case</h2>
          </div>
          <button type="button" aria-label="Close case creation dialog" disabled={workflow.busy} onClick={requestClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"><X className="h-5 w-5"/></button>
        </div>
        <ol aria-label="Case creation progress" className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
          <StepIndicator number={1} label="Case details" current={step === 1} complete={step === 2}/>
          <StepIndicator number={2} label="Educational media" current={step === 2} complete={false}/>
        </ol>
      </header>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); if (step === 1) continueToImages(); else void submit(); }}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">Step {step} of 2</p>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-xl font-black text-slate-950 outline-none">{step === 1 ? "Case details" : "Educational media"}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{step === 1 ? "Capture the generic context you want to remember." : "Optionally add de-identified images before the case is created."}</p>
          </div>
          {step === 1
            ? <CaseDetailsStep values={details} errors={detailErrors} onChange={updateDetail}/>
            : <CaseMediaStep
                items={staged.items}
                validationErrors={staged.validationErrors}
                attested={attested}
                attestationError={attestationError}
                busy={workflow.busy}
                caseCreated={Boolean(workflow.createdCase)}
                workflowError={workflow.error}
                onAddFiles={staged.addFiles}
                onRemove={staged.remove}
                onCaption={staged.updateCaption}
                onAttestation={(value) => { setAttested(value); if (value) setAttestationError(""); }}
              />}
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {step === 2 && !workflow.createdCase && <button type="button" disabled={workflow.busy} onClick={() => setStep(1)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 sm:w-auto"><ArrowLeft className="h-4 w-4"/>Back</button>}
              {step === 2 && workflow.createdCase && <p className="text-center text-xs font-semibold text-slate-500 sm:text-left">The case ID is preserved. Retry uploads will not create another case.</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {step === 2 && workflow.createdCase && <button type="button" disabled={workflow.busy} onClick={() => void openCreatedCase()} className="min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-black text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40">Open case</button>}
              <button type="submit" disabled={workflow.busy || (Boolean(workflow.createdCase) && failedCount === 0)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">
                {workflow.busy ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none"/>{workflow.createdCase ? "Retrying images…" : "Creating case…"}</> : step === 1 ? <>Continue to images<ArrowRight className="h-4 w-4"/></> : workflow.createdCase ? `Retry ${failedCount} failed ${failedCount === 1 ? "image" : "images"}` : hasMedia ? "Create case and upload images" : "Create case"}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  </div>;
}

function StepIndicator({ number, label, current, complete }: { number: number; label: string; current: boolean; complete: boolean }) {
  return <li aria-current={current ? "step" : undefined} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${current ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-500"}`}>
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${current || complete ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-600"}`}>{complete ? <Check className="h-3.5 w-3.5"/> : number}</span>
    <span className="truncate">{label}</span>
  </li>;
}

function casePayload(values: CaseDetailsValues): MyCasesCaseInput {
  const optional = (value: string) => value.trim() || null;
  return {
    title: values.title.trim(),
    procedure_name: values.procedure.trim(),
    diagnosis: optional(values.diagnosis),
    rotation_context: optional(values.rotation),
    attending_context: optional(values.attending),
    status: values.status,
    difficulty: values.difficulty === "" ? null : Number(values.difficulty),
    autonomy: values.autonomy === "" ? null : Number(values.autonomy),
    preparation: optional(values.preparation),
    debrief: optional(values.debrief),
    tags: values.tags.split(",").map((value) => value.trim()).filter(Boolean),
  };
}

function uploadableMedia(items: ReturnType<typeof useStagedCaseMedia>["items"]): CaseMediaUpload[] {
  return items.flatMap((item) => item.file ? [{ ...item, file: item.file }] : []);
}
