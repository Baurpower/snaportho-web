"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { savePendingBroBotRequest } from "@/lib/brobot/pending-request";

export function BroBotLaunchButton({
  prompt,
  mode,
  depth,
  label,
  className,
}: {
  prompt: string;
  mode: "or_prep" | "clinic" | "consult" | "general";
  depth: "quick" | "standard" | "deep";
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      type="button"
      onClick={() => {
        savePendingBroBotRequest({
          prompt,
          mode,
          responseDepth: depth,
          trainingLevel: "med_student",
          sourceRoute: pathname || "/student-workspace/prepare",
        });
        router.push("/brobot/chat");
      }}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
      }
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </button>
  );
}
