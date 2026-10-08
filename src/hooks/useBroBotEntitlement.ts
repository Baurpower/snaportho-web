'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchMeEntitlementsView,
  toWebBroBotUsageMeta,
  toWebEntitlementMenuStatus,
  toWebUsageSnapshot,
  type WebEntitlementView,
} from '@/lib/brobot/billing-entitlement-state';
import { BROBOT_ENTITLEMENT_INVALIDATED_EVENT } from '@/lib/brobot/brobot-entitlement-events';
import { useAuth } from '@/context/AuthContext';

export type UseBroBotEntitlementResult = {
  view: WebEntitlementView | null;
  loading: boolean;
  error: boolean;
  isUnlimited: boolean;
  refresh: () => Promise<WebEntitlementView | null>;
  usage: ReturnType<typeof toWebUsageSnapshot> | null;
  menuStatus: ReturnType<typeof toWebEntitlementMenuStatus> | null;
  usageMeta: ReturnType<typeof toWebBroBotUsageMeta> | null;
};

export function useBroBotEntitlement(source: string): UseBroBotEntitlementResult {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<WebEntitlementView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /** Skip focus/visibility refetch when a successful refresh completed within this window. */
  const FOCUS_REFETCH_DEBOUNCE_MS = 60_000;
  const lastSuccessfulRefreshAtRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setView(null);
      setLoading(false);
      setError(false);
      return null;
    }

    setError(false);

    try {
      const nextView = await fetchMeEntitlementsView({ source });
      setView(nextView);
      setError(!nextView);
      if (nextView) {
        lastSuccessfulRefreshAtRef.current = Date.now();
      }
      return nextView;
    } catch {
      setView(null);
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, [source, user]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!user) return;

    const shouldSkipFocusVisibilityRefetch = () => {
      const last = lastSuccessfulRefreshAtRef.current;
      return last != null && Date.now() - last < FOCUS_REFETCH_DEBOUNCE_MS;
    };

    const handleInvalidate = () => {
      void refresh();
    };

    const handleFocus = () => {
      if (shouldSkipFocusVisibilityRefetch()) return;
      void refresh();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (shouldSkipFocusVisibilityRefetch()) return;
        void refresh();
      }
    };

    window.addEventListener(BROBOT_ENTITLEMENT_INVALIDATED_EVENT, handleInvalidate);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener(BROBOT_ENTITLEMENT_INVALIDATED_EVENT, handleInvalidate);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh, user]);

  const resolvedView = user ? view : null;
  const usage = useMemo(
    () => (resolvedView ? toWebUsageSnapshot(resolvedView) : null),
    [resolvedView]
  );
  const menuStatus = useMemo(
    () => (resolvedView ? toWebEntitlementMenuStatus(resolvedView) : null),
    [resolvedView]
  );
  const usageMeta = useMemo(
    () => (resolvedView ? toWebBroBotUsageMeta(resolvedView) : null),
    [resolvedView]
  );

  return {
    view: resolvedView,
    loading: authLoading || loading,
    error,
    isUnlimited: resolvedView?.isUnlimited === true,
    refresh,
    usage,
    menuStatus,
    usageMeta,
  };
}
