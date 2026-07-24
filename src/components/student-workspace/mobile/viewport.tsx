import type { ReactNode } from "react";

/**
 * Viewport split helpers for the student workspace.
 *
 * The mobile experience is a separate component tree rather than a set of
 * responsive tweaks, so the desktop markup stays byte-for-byte identical.
 * The split is CSS-driven (not JS media queries) so server rendering stays
 * correct and there is no first-paint flash.
 */

export function MobileOnly({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`md:hidden${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function DesktopOnly({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hidden md:block${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
