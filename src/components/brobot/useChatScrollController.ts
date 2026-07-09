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
const ANCHOR_SELECTOR = '[data-chat-scroll-anchor="true"]';

function getDistanceFromBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight;
}

type ScrollAnchor = {
  id: string;
  offset: number;
  scrollTop: number;
};

function getFirstVisibleAnchor(viewport: HTMLDivElement): ScrollAnchor | null {
  const viewportTop = viewport.getBoundingClientRect().top;
  const anchors = Array.from(
    viewport.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR)
  );

  const firstVisible =
    anchors.find((anchor) => anchor.getBoundingClientRect().bottom > viewportTop) ??
    anchors[0];

  const id = firstVisible?.dataset.chatScrollId;
  if (!firstVisible || !id) return null;

  return {
    id,
    offset: firstVisible.getBoundingClientRect().top - viewportTop,
    scrollTop: viewport.scrollTop,
  };
}

function restoreAnchor(viewport: HTMLDivElement, anchor: ScrollAnchor) {
  const element = viewport.querySelector<HTMLElement>(
    `[data-chat-scroll-id="${CSS.escape(anchor.id)}"]`
  );

  if (!element) {
    viewport.scrollTop = anchor.scrollTop;
    return;
  }

  const viewportTop = viewport.getBoundingClientRect().top;
  const nextOffset = element.getBoundingClientRect().top - viewportTop;
  viewport.scrollTop += nextOffset - anchor.offset;
}

export function useChatScrollController({
  viewportRef,
  contentVersion,
  activeAssistantId,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentVersion: string;
  activeAssistantId?: string | null;
}) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const isPinnedToBottomRef = useRef(true);
  const userPinnedRef = useRef(true);
  const previousVersionRef = useRef(contentVersion);
  const previousAnchorRef = useRef<ScrollAnchor | null>(null);
  const previousScrollTopRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const lastAnchoredAssistantIdRef = useRef<string | null>(null);

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const nearBottom = getDistanceFromBottom(viewport) <= NEAR_BOTTOM_PX;
    const movedUp = viewport.scrollTop < previousScrollTopRef.current - 2;
    if (movedUp && !nearBottom) {
      userPinnedRef.current = false;
      isPinnedToBottomRef.current = false;
    }

    setIsNearBottom(nearBottom);

    if (nearBottom) {
      userPinnedRef.current = true;
      isPinnedToBottomRef.current = true;
      setUserHasScrolledUp(false);
      setShowNewMessagesButton(false);
    } else if (!userPinnedRef.current) {
      isPinnedToBottomRef.current = false;
      setUserHasScrolledUp(true);
    }

    previousAnchorRef.current = getFirstVisibleAnchor(viewport);
    previousScrollTopRef.current = viewport.scrollTop;
  }, [viewportRef]);

  const unpinFromUserIntent = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (getDistanceFromBottom(viewport) <= NEAR_BOTTOM_PX) return;

    userPinnedRef.current = false;
    isPinnedToBottomRef.current = false;
    setUserHasScrolledUp(true);
    setIsNearBottom(false);
    previousAnchorRef.current = getFirstVisibleAnchor(viewport);
    previousScrollTopRef.current = viewport.scrollTop;
  }, [viewportRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorMode = 'smooth') => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      userPinnedRef.current = true;
      isPinnedToBottomRef.current = true;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      });
      setIsNearBottom(true);
      setUserHasScrolledUp(false);
      setShowNewMessagesButton(false);
      previousAnchorRef.current = getFirstVisibleAnchor(viewport);
      previousScrollTopRef.current = viewport.scrollTop;
    },
    [viewportRef]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    updateScrollState();
    let touchStartY: number | null = null;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        unpinFromUserIntent();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (touchStartY === null) return;
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      if (currentY > touchStartY + 2) {
        unpinFromUserIntent();
      }
      touchStartY = currentY;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        ['ArrowUp', 'PageUp', 'Home'].includes(event.key) ||
        (event.key === ' ' && event.shiftKey)
      ) {
        unpinFromUserIntent();
      }
    };

    const handlePointerDown = () => {
      previousAnchorRef.current = getFirstVisibleAnchor(viewport);
    };

    viewport.addEventListener('scroll', updateScrollState, { passive: true });
    viewport.addEventListener('wheel', handleWheel, { passive: true });
    viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewport.addEventListener('touchmove', handleTouchMove, { passive: true });
    viewport.addEventListener('keydown', handleKeyDown);
    viewport.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', updateScrollState);
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('touchstart', handleTouchStart);
      viewport.removeEventListener('touchmove', handleTouchMove);
      viewport.removeEventListener('keydown', handleKeyDown);
      viewport.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [unpinFromUserIntent, updateScrollState, viewportRef]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const contentChanged = previousVersionRef.current !== contentVersion;
    previousVersionRef.current = contentVersion;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      previousAnchorRef.current = getFirstVisibleAnchor(viewport);
      previousScrollTopRef.current = viewport.scrollTop;
      lastAnchoredAssistantIdRef.current = activeAssistantId ?? null;
      return;
    }

    // A new assistant response starts pinned to the newest content. Explicit
    // wheel/touch/keyboard scrolling above unpins it via the handlers above.
    if (activeAssistantId && lastAnchoredAssistantIdRef.current !== activeAssistantId) {
      lastAnchoredAssistantIdRef.current = activeAssistantId;
      userPinnedRef.current = true;
      isPinnedToBottomRef.current = true;
      viewport.scrollTop = viewport.scrollHeight;
      setIsNearBottom(true);
      setUserHasScrolledUp(false);
      setShowNewMessagesButton(false);
      previousAnchorRef.current = getFirstVisibleAnchor(viewport);
      previousScrollTopRef.current = viewport.scrollTop;
      return;
    }

    if (isPinnedToBottomRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      previousAnchorRef.current = getFirstVisibleAnchor(viewport);
      previousScrollTopRef.current = viewport.scrollTop;
      setShowNewMessagesButton(false);
      return;
    }

    if (previousAnchorRef.current) {
      restoreAnchor(viewport, previousAnchorRef.current);
    }
    previousAnchorRef.current = getFirstVisibleAnchor(viewport);
    previousScrollTopRef.current = viewport.scrollTop;

    if (contentChanged) {
      setShowNewMessagesButton(true);
    }
  }, [contentVersion, activeAssistantId, viewportRef]);

  const resetScrollState = useCallback(() => {
    isPinnedToBottomRef.current = true;
    userPinnedRef.current = true;
    lastAnchoredAssistantIdRef.current = null;
    hasInitializedRef.current = false;
    previousAnchorRef.current = null;
    previousScrollTopRef.current = 0;
    setIsNearBottom(true);
    setUserHasScrolledUp(false);
    setShowNewMessagesButton(false);
  }, []);

  return {
    isNearBottom,
    isPinnedToBottom: isPinnedToBottomRef.current,
    userHasScrolledUp,
    showNewMessagesButton,
    scrollToBottom,
    resetScrollState,
  };
}
