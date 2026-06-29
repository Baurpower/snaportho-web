"use client";

import { CheckCircle2 } from "lucide-react";
import { BroBotLaunchCard } from "@/components/student-workspace/prepare/BroBotLaunchCard";
import { CasePrepStep } from "@/components/student-workspace/prepare/CasePrepStep";
import { PreparationStep } from "@/components/student-workspace/prepare/PreparationStep";
import { ResourceList } from "@/components/student-workspace/prepare/ResourceList";
import type { GuidedWorkflowStep } from "@/components/student-workspace/prepare/types";

export function PreparationSession({
  title,
  subtitle,
  steps,
  activeStepIndex,
  completedStepIds,
  onSelectStep,
  onToggleStepComplete,
}: {
  title: string;
  subtitle: string;
  steps: GuidedWorkflowStep[];
  activeStepIndex: number;
  completedStepIds: Set<string>;
  onSelectStep: (index: number) => void;
  onToggleStepComplete: (stepId: string) => void;
}) {
  const activeStep = steps[activeStepIndex] ?? null;
  const completeCount = steps.filter((step) => completedStepIds.has(step.id)).length;

  return (
    <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Current Preparation Session
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{subtitle}</p>
          <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {completeCount} of {steps.length} steps complete
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <PreparationStep
                key={step.id}
                step={step}
                active={index === activeStepIndex}
                complete={completedStepIds.has(step.id)}
                onSelect={() => onSelectStep(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {activeStep ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active Step
          </p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {activeStep.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {activeStep.description}
          </p>

          <div className="mt-6 space-y-4">
            <ResourceList resources={activeStep.resources} />
            {activeStep.casePrepActionLabel ? (
              <CasePrepStep label={activeStep.casePrepActionLabel} />
            ) : null}
            <BroBotLaunchCard step={activeStep} />
          </div>

          <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 border-t border-slate-100 bg-white pt-5">
            <button
              type="button"
              onClick={() => onToggleStepComplete(activeStep.id)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                completedStepIds.has(activeStep.id)
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-950 text-white hover:bg-slate-800"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {completedStepIds.has(activeStep.id) ? "Mark as Not Done" : "Mark Step Complete"}
            </button>
            {activeStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => onSelectStep(activeStepIndex + 1)}
                className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Next Step
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
