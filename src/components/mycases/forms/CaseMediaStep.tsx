/* eslint-disable @next/next/no-img-element -- local object URLs must not use the Next image optimizer */
"use client";

import { AlertCircle, Check, FileImage, ImagePlus, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { MYCASES_MEDIA_CAPTION_MAX } from "@/lib/mycases/media/types";
import { MYCASES_CASE_MEDIA_ACCEPT, MYCASES_CASE_MEDIA_MAX_FILES, type StagedCaseMedia } from "../hooks/useStagedCaseMedia";

export function CaseMediaStep({
  items,
  validationErrors,
  attested,
  attestationError,
  busy,
  caseCreated,
  workflowError,
  onAddFiles,
  onRemove,
  onCaption,
  onAttestation,
}: {
  items: StagedCaseMedia[];
  validationErrors: string[];
  attested: boolean;
  attestationError: string;
  busy: boolean;
  caseCreated: boolean;
  workflowError: string;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onCaption: (id: string, caption: string) => void;
  onAttestation: (value: boolean) => void;
}) {
  const failedCount = items.filter((item) => item.status === "failed").length;
  const completeCount = items.filter((item) => item.status === "complete").length;
  const activeCount = items.filter((item) => item.status !== "complete").length;
  return <div className="space-y-6">
    {caseCreated && <CaseCreationProgress completeCount={completeCount} failedCount={failedCount}/>}
    {!caseCreated && <MediaDropzone disabled={busy || items.length >= MYCASES_CASE_MEDIA_MAX_FILES} onFiles={onAddFiles}/>}

    <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="font-bold text-slate-800">{items.length} of {MYCASES_CASE_MEDIA_MAX_FILES} images selected</p>
      <p className="text-xs text-slate-500">JPEG, PNG, HEIC, or HEIF · 10 MB each</p>
    </div>

    {validationErrors.length > 0 && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {validationErrors.map((message) => <p key={message}>{message}</p>)}
    </div>}
    {workflowError && <div role="alert" tabIndex={-1} data-workflow-error className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><span>{workflowError}</span></div>}

    {items.length > 0 ? <StagedMediaGrid items={items} busy={busy} onRemove={onRemove} onCaption={onCaption}/> : <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-6 text-center">
      <FileImage className="mx-auto h-7 w-7 text-slate-400"/>
      <p className="mt-2 text-sm font-bold text-slate-700">Images are optional</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">You can create the case now and add images from its gallery later.</p>
    </div>}

    {activeCount > 0 && <section aria-labelledby="privacy-check-heading" className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-700"/><h3 id="privacy-check-heading" className="text-sm font-black text-slate-900">Privacy check</h3></div>
      <ul className="mt-3 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-2">
        <li>• No patient names, MRNs, or dates of birth</li><li>• No faces, labels, or wristbands</li><li>• No encounter details or reports</li><li>• No DICOM or other clinical documents</li>
      </ul>
      <label className="mt-4 flex items-start gap-3 text-sm font-semibold leading-6 text-slate-800">
        <input id="case-media-attestation" type="checkbox" checked={attested} disabled={busy} aria-invalid={Boolean(attestationError)} aria-describedby={attestationError ? "case-media-attestation-error" : "case-media-attestation-help"} onChange={(event) => onAttestation(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-700"/>
        <span>I confirm these images contain no patient names, faces, labels, wristbands, MRNs, DOBs, encounter details, or other identifiers.</span>
      </label>
      <p id="case-media-attestation-help" className="mt-2 text-xs leading-5 text-slate-500">The server validates, decodes, re-encodes, strips metadata, and creates thumbnails. Automated processing does not prove de-identification.</p>
      {attestationError && <p id="case-media-attestation-error" className="mt-2 text-xs font-bold text-red-700">{attestationError}</p>}
    </section>}
  </div>;
}

function MediaDropzone({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) {
  return <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!disabled) onFiles(Array.from(event.dataTransfer.files)); }} className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 sm:p-8">
    <ImagePlus className="mx-auto h-8 w-8 text-blue-700"/>
    <p className="mt-3 text-base font-black text-slate-900">Drop educational images here</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">Up to {MYCASES_CASE_MEDIA_MAX_FILES} images. No DICOM, SVG, PDF, GIF, TIFF, or documents.</p>
    <label className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
      Choose images
      <input type="file" multiple disabled={disabled} accept={MYCASES_CASE_MEDIA_ACCEPT} className="sr-only" onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }}/>
    </label>
  </div>;
}

function StagedMediaGrid({ items, busy, onRemove, onCaption }: { items: StagedCaseMedia[]; busy: boolean; onRemove: (id: string) => void; onCaption: (id: string, caption: string) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2" aria-label="Selected educational images">
    {items.map((item, index) => <StagedMediaItem key={item.id} item={item} index={index} busy={busy} onRemove={onRemove} onCaption={onCaption}/>) }
  </div>;
}

function StagedMediaItem({ item, index, busy, onRemove, onCaption }: { item: StagedCaseMedia; index: number; busy: boolean; onRemove: (id: string) => void; onCaption: (id: string, caption: string) => void }) {
  const locked = busy || item.status === "uploading" || item.status === "processing" || item.status === "complete";
  return <article className={`overflow-hidden rounded-lg border bg-white ${item.status === "failed" ? "border-red-300" : item.status === "complete" ? "border-emerald-300" : "border-slate-200"}`}>
    <div className="relative aspect-[16/9] bg-slate-100">
      {item.previewUrl ? <img src={item.previewUrl} alt={`Temporary preview of selected educational image ${index + 1}`} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-emerald-700"><Check className="h-9 w-9"/><span className="sr-only">Upload complete</span></div>}
      <StatusBadge status={item.status}/>
      {!locked && <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove selected image ${index + 1}`} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 text-white outline-none focus-visible:ring-2 focus-visible:ring-white"><Trash2 className="h-4 w-4"/></button>}
    </div>
    <div className="p-3">
      <p className="truncate text-xs font-bold text-slate-700" title={item.displayName}>{item.displayName}</p>
      <label htmlFor={`case-media-caption-${item.id}`} className="mt-3 block text-xs font-bold text-slate-700">Optional educational caption
        <textarea id={`case-media-caption-${item.id}`} rows={2} maxLength={MYCASES_MEDIA_CAPTION_MAX} disabled={locked} value={item.caption} onChange={(event) => onCaption(item.id, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm font-normal outline-none focus:border-blue-600 disabled:bg-slate-50"/>
      </label>
      {item.error && <p role="alert" className="mt-2 text-xs font-semibold leading-5 text-red-700">{item.error}</p>}
    </div>
  </article>;
}

function StatusBadge({ status }: { status: StagedCaseMedia["status"] }) {
  const style = status === "failed" ? "bg-red-700" : status === "complete" ? "bg-emerald-700" : "bg-slate-950/80";
  return <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black capitalize text-white ${style}`}>
    {(status === "uploading" || status === "processing") && <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none"/>}
    {status === "failed" && <RotateCcw className="h-3 w-3"/>}{status}
  </span>;
}

function CaseCreationProgress({ completeCount, failedCount }: { completeCount: number; failedCount: number }) {
  return <div role="status" className={`rounded-lg border p-4 ${failedCount ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
    <p className="font-black text-slate-900">Case created successfully</p>
    <p className="mt-1 text-sm leading-5 text-slate-600">{completeCount} images uploaded. {failedCount ? `${failedCount} failed and can be retried without creating another case.` : "Finishing the image workflow…"}</p>
  </div>;
}
