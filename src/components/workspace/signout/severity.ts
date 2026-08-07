import type { SignoutSeverity } from "@/lib/workspace/signout/types";

/** Visual language for I-PASS illness severity (stable / watcher / unstable). */
export const SEVERITY_META: Record<
  SignoutSeverity,
  { label: string; rail: string; chip: string; dot: string; order: number }
> = {
  unstable: {
    label: "Unstable",
    rail: "bg-red-500",
    chip: "bg-red-50 text-red-800",
    dot: "bg-red-500",
    order: 0,
  },
  watcher: {
    label: "Watcher",
    rail: "bg-amber-400",
    chip: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    order: 1,
  },
  stable: {
    label: "Stable",
    rail: "bg-emerald-400",
    chip: "bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    order: 2,
  },
};

export const SEVERITY_CYCLE: SignoutSeverity[] = ["stable", "watcher", "unstable"];

/** Next severity when the rail chip is clicked (stable → watcher → unstable → stable). */
export function nextSeverity(current: SignoutSeverity): SignoutSeverity {
  const idx = SEVERITY_CYCLE.indexOf(current);
  return SEVERITY_CYCLE[(idx + 1) % SEVERITY_CYCLE.length];
}
