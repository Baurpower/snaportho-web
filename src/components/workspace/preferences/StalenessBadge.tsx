"use client";

import React from "react";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";

type Props = {
  updatedAt: string;
  updatedByName?: string | null;
  className?: string;
};

function getStaleness(updatedAt: string): "fresh" | "aging" | "stale" {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 30) return "fresh";
  if (days < 90) return "aging";
  return "stale";
}

function formatRelative(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function StalenessBadge({ updatedAt, updatedByName, className = "" }: Props) {
  const level = getStaleness(updatedAt);
  const relative = formatRelative(updatedAt);

  const config = {
    fresh: {
      icon: CheckCircle2,
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      label: `Updated ${relative}`,
    },
    aging: {
      icon: Clock,
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      label: `Updated ${relative}`,
    },
    stale: {
      icon: AlertTriangle,
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      label: `Stale — updated ${relative}`,
    },
  }[level];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {config.label}
      {updatedByName ? ` · ${updatedByName}` : ""}
    </span>
  );
}
