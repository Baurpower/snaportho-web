"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe hook that reports whether the viewport is below the md breakpoint (767px).
 * Returns false during SSR and on initial client render until mounted.
 * Listens to changes via matchMedia.
 *
 * Prefer Tailwind responsive utilities (md:hidden, etc.) for pure styling.
 * Use this hook only when you need *JavaScript* behavior differences on mobile
 * (e.g. default open state for a sheet, different initial view, etc.).
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = `(max-width: ${breakpoint - 1}px)`;
    const mql = window.matchMedia(mediaQuery);

    // Set initial value after mount (avoids hydration mismatch)
    setIsMobile(mql.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // Modern browsers
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }

    // Older Safari fallback
    mql.addListener?.(handleChange);
    return () => mql.removeListener?.(handleChange);
  }, [breakpoint]);

  return isMobile;
}
