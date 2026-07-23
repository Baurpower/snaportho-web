"use client";

import { useCallback, useEffect, useState } from "react";

/** Sections expanded by default (above-the-fold content). */
const DEFAULT_EXPANDED = new Set([
  "summary",
  "key_takeaways",
  "top_things_to_know",
  "pimp_questions",
]);

function storageKey(slug: string): string {
  return `caseprep.v1.1.expanded.${slug || "unknown"}`;
}

/**
 * Collapsible-section state persisted per procedure in localStorage.
 * SSR-safe: initial render uses defaults; the stored map loads in an effect.
 */
export function useExpandedSections(slug: string) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const stored = window.localStorage.getItem(storageKey(slug));
      setExpanded(stored ? (JSON.parse(stored) as Record<string, boolean>) : {});
    } catch {
      setExpanded({});
    }
    setLoaded(true);
  }, [slug]);

  const isExpanded = useCallback(
    (sectionId: string): boolean => expanded[sectionId] ?? DEFAULT_EXPANDED.has(sectionId),
    [expanded]
  );

  const toggle = useCallback(
    (sectionId: string) => {
      setExpanded((prev) => {
        const next = {
          ...prev,
          [sectionId]: !(prev[sectionId] ?? DEFAULT_EXPANDED.has(sectionId)),
        };
        try {
          window.localStorage.setItem(storageKey(slug), JSON.stringify(next));
        } catch {
          // Storage unavailable (private mode) — state stays in memory.
        }
        return next;
      });
    },
    [slug]
  );

  return { isExpanded, toggle, loaded };
}
