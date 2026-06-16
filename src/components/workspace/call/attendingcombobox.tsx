"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Star } from "lucide-react";
import type { ProgramAttending } from "@/lib/workspace/call/types";
import { getAttendingDisplayName } from "@/lib/workspace/call/attendings-shared";

type AttendingComboboxProps = {
  attendings: ProgramAttending[];
  selectedId: string;
  recentIds: string[];
  onSelect: (attendingId: string) => void;
  disabled?: boolean;
};

function attendingLabel(attending: ProgramAttending) {
  return getAttendingDisplayName(attending);
}

export default function AttendingCombobox({
  attendings,
  selectedId,
  recentIds,
  onSelect,
  disabled = false,
}: AttendingComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "attending-coverage-favorites"
      );
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavoriteIds(
            parsed.filter((value): value is string => typeof value === "string")
          );
        }
      }
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selected = attendings.find(
    (attending) => attending.id === selectedId
  );
  const visibleAttendings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const recentOrder = new Map(recentIds.map((id, index) => [id, index]));

    return attendings
      .filter((attending) =>
        normalizedQuery
          ? attendingLabel(attending).toLowerCase().includes(normalizedQuery)
          : true
      )
      .sort((a, b) => {
        const favoriteDelta =
          Number(favoriteIds.includes(b.id)) -
          Number(favoriteIds.includes(a.id));
        if (favoriteDelta !== 0) return favoriteDelta;

        const aRecent = recentOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bRecent = recentOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (aRecent !== bRecent) return aRecent - bRecent;

        return attendingLabel(a).localeCompare(attendingLabel(b));
      });
  }, [attendings, favoriteIds, query, recentIds]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function choose(attendingId: string) {
    onSelect(attendingId);
    setOpen(false);
    setQuery("");
  }

  function toggleFavorite(attendingId: string) {
    setFavoriteIds((current) => {
      const next = current.includes(attendingId)
        ? current.filter((id) => id !== attendingId)
        : [attendingId, ...current];
      try {
        window.localStorage.setItem(
          "attending-coverage-favorites",
          JSON.stringify(next)
        );
      } catch {
        // Favorites remain available for this session when storage is blocked.
      }
      return next;
    });
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-800 shadow-sm transition hover:border-sky-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate font-semibold">
          {selected ? attendingLabel(selected) : "Choose attending"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-50 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((current) =>
                      Math.min(current + 1, visibleAttendings.length - 1)
                    );
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((current) => Math.max(current - 1, 0));
                  } else if (
                    event.key === "Enter" &&
                    visibleAttendings[activeIndex]
                  ) {
                    event.preventDefault();
                    choose(visibleAttendings[activeIndex].id);
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Search attendings..."
                className="w-full rounded-xl bg-slate-100 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none ring-sky-200 placeholder:text-slate-400 focus:ring-2"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {visibleAttendings.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                No attendings match “{query}”.
              </p>
            ) : (
              visibleAttendings.map((attending, index) => {
                const label = attendingLabel(attending);
                const favorite = favoriteIds.includes(attending.id);
                const recent = recentIds.includes(attending.id);
                return (
                  <div
                    key={attending.id}
                    className={`flex items-center rounded-xl ${
                      index === activeIndex ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(attending.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-800">
                        {label
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">
                          {label}
                        </span>
                        {recent ? (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Recent
                          </span>
                        ) : null}
                      </span>
                      {attending.id === selectedId ? (
                        <Check className="h-4 w-4 shrink-0 text-teal-600" />
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(attending.id)}
                      className={`mr-2 rounded-lg p-2 transition ${
                        favorite
                          ? "text-amber-500"
                          : "text-slate-300 hover:text-amber-500"
                      }`}
                      aria-label={
                        favorite
                          ? `Remove ${label} from favorites`
                          : `Add ${label} to favorites`
                      }
                    >
                      <Star
                        className="h-4 w-4"
                        fill={favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
