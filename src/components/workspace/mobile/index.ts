/**
 * Barrel export for shared mobile workspace primitives (Phase 2).
 *
 * These components and hooks are designed to be used in future
 * mobile-specific views (Program Call agenda, Weekly Schedule list,
 * Rotation Coverage cards, etc.) without affecting any desktop code.
 *
 * All components are additive, controlled where stateful, and follow
 * existing workspace visual language (slate palette, rounded-2xl,
 * generous touch targets, safe-area support).
 */

// Hook (use only when you truly need JS-driven mobile behavior)
export { useIsMobile } from "@/hooks/useIsMobile";

// Layout / primitive components
export { MobileCardShell, type MobileCardShellProps } from "./mobilecardshell";
export { MobileSectionHeader, type MobileSectionHeaderProps } from "./mobilesectionheader";
export { MobileMonthSelector, type MobileMonthSelectorProps, type MobileMonthOption } from "./mobilemonthselector";
export { MobileBottomSheet, type MobileBottomSheetProps } from "./mobilebottomsheet";
