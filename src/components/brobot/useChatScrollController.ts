'use client';

import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type ScrollBehaviorMode = ScrollBehavior;

const NEAR_BOTTOM_PX = 96;

function getDistanceFromBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

export function useChatScrollController({
  viewportRef,
  contentVersion,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentVersion: string;
}) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const isPinnedToBottomRef = useRef(true);
  const previousVersionRef = useRef(contentVersion);
  const previousScrollTopRef = useRef(0);

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const nearBottom = getDistanceFromBottom(viewport) <= NEAR_BOTTOM_PX;
    isPinnedToBottomRef.current = nearBottom;
    setIsNearBottom(nearBottom);
    setUserHasScrolledUp(!nearBottom);

    if (nearBottom) {
      setShowNewMessagesButton(false);
    }

    previousScrollTopRef.current = viewport.scrollTop;
  }, [viewportRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorMode = 'smooth') => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      });
      isPinnedToBottomRef.current = true;
      setIsNearBottom(true);
      setUserHasScrolledUp(false);
      setShowNewMessagesButton(false);
      previousScrollTopRef.current = viewport.scrollHeight;
    },
    [viewportRef]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    updateScrollState();
    viewport.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState, viewportRef]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const contentChanged = previousVersionRef.current !== contentVersion;
    previousVersionRef.current = contentVersion;

    if (isPinnedToBottomRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      previousScrollTopRef.current = viewport.scrollTop;
      setShowNewMessagesButton(false);
      return;
    }

    viewport.scrollTop = previousScrollTopRef.current;

    if (contentChanged) {
      setShowNewMessagesButton(true);
    }
  }, [contentVersion, viewportRef]);

  return {
    isNearBottom,
    isPinnedToBottom: isPinnedToBottomRef.current,
    userHasScrolledUp,
    showNewMessagesButton,
    scrollToBottom,
  };
}
