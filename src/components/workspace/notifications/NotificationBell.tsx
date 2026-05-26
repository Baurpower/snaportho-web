"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import { useWorkspaceNotifications } from "@/hooks/useWorkspaceNotifications";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { useMarkNotificationRead } from "@/hooks/useMarkNotificationRead";
import { useMarkAllNotificationsRead } from "@/hooks/useMarkAllNotificationsRead";
import type { WorkspaceNotification } from "@/lib/workspace/notifications/types";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const notifications = useWorkspaceNotifications({ limit: 12 });
  const unreadCount = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleNotificationClick(notification: WorkspaceNotification) {
    if (!notification.read_at) {
      try {
        await markRead.markRead(notification.id);
        await Promise.all([notifications.refresh(), unreadCount.refresh()]);
      } catch {
        // hook state already captures the error
      }
    }

    setOpen(false);
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.markAllRead();
      await Promise.all([notifications.refresh(), unreadCount.refresh()]);
    } catch {
      // hook state already captures the error
    }
  }

  const combinedError =
    notifications.error ??
    unreadCount.error ??
    markRead.error ??
    markAllRead.error ??
    null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount.count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount.count > 99 ? "99+" : unreadCount.count}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationDropdown
          notifications={notifications.items}
          loading={notifications.loading}
          error={combinedError}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={() => void handleMarkAllRead()}
          markingAllRead={markAllRead.loading}
          markReadLoadingId={markRead.loadingNotificationId}
        />
      ) : null}
    </div>
  );
}
