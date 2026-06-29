"use client";

import React from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { MobileCardShell } from "@/components/shared/mobile/MobileCardShell";

type StudentWorkspaceSectionCardProps = {
  title: string;
  description: string;
  eyebrow: string;
};

export function StudentWorkspaceSectionCard({
  title,
  description,
  eyebrow,
}: StudentWorkspaceSectionCardProps) {
  return (
    <MobileCardShell className="h-full">
      <div className="flex h-full flex-col">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          <Clock3 className="h-3.5 w-3.5" />
          {eyebrow}
        </div>

        <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
          Coming next
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </MobileCardShell>
  );
}
