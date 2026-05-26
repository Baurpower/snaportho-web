"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { WorkspaceNotification } from "@/lib/workspace/notifications/types";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationDropdown({
  notifications,
  loading,
  error,
  onNotificationClick,
  onMarkAllRead,
  markingAllRead,
  markReadLoadingId,
}: {
  notifications: WorkspaceNotification[];
  loading: boolean;
  error: string | null;
  onNotificationClick: (notification: WorkspaceNotification) => void;
  onMarkAllRead: () => void;
  markingAllRead: boolean;
  markReadLoadingId: string | null;
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[220] w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-950">
              Notifications
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Recent workspace updates
            </p>
          </div>

          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={markingAllRead || notifications.length === 0}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {markingAllRead ? "Marking..." : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="max-h-[28rem] overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : error ? (
          <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const isUnread = !notification.read_at;
              const content = (
                <div
                  className={`rounded-[1rem] border px-3 py-3 text-left transition ${
                    isUnread
                      ? "border-sky-200 bg-sky-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {notification.message}
                      </p>
                    </div>

                    {markReadLoadingId === notification.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : isUnread ? (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {formatTimestamp(notification.created_at)}
                  </p>
                </div>
              );

              if (notification.action_url) {
                return (
                  <Link
                    key={notification.id}
                    href={notification.action_url}
                    onClick={() => onNotificationClick(notification)}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className="block w-full"
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
