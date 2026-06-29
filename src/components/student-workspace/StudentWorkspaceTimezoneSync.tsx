"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function StudentWorkspaceTimezoneSync({
  profileTimeZone,
}: {
  profileTimeZone: string | null;
}) {
  const router = useRouter();
  const syncedTimeZoneRef = useRef<string | null>(profileTimeZone);

  useEffect(() => {
    syncedTimeZoneRef.current = profileTimeZone;
  }, [profileTimeZone]);

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTimeZone || syncedTimeZoneRef.current === browserTimeZone) {
      return;
    }

    let cancelled = false;

    async function syncTimeZone() {
      const response = await fetch("/api/student-workspace/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: browserTimeZone }),
      });

      if (!response.ok || cancelled) {
        return;
      }

      syncedTimeZoneRef.current = browserTimeZone;
      router.refresh();
    }

    void syncTimeZone();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
