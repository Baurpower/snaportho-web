"use client";

import React from "react";

export interface MobileCardShellProps {
  children: React.ReactNode;
  className?: string;
  accentClassName?: string;
  onClick?: () => void;
  role?: string;
  contentClassName?: string;
}

export function MobileCardShell({
  children,
  className = "",
  accentClassName,
  onClick,
  role,
  contentClassName,
}: MobileCardShellProps) {
  const isInteractive = !!onClick;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!isInteractive || !onClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onClick();
  }

  return (
    <div
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? role || "button" : role}
      tabIndex={isInteractive ? 0 : undefined}
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white shadow-sm",
        "overflow-hidden transition",
        isInteractive
          ? "cursor-pointer active:scale-[0.985] hover:border-slate-300 hover:shadow-md"
          : "",
        className,
      ].join(" ")}
    >
      {accentClassName ? (
        <div className={`h-1.5 ${accentClassName}`} aria-hidden="true" />
      ) : null}

      <div className={contentClassName ?? "p-4"}>{children}</div>
    </div>
  );
}
