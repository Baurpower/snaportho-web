"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/utils/supabase/client";

function BroBotDeckLinkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deviceName, setDeviceName] = useState("");

  const linkCode = searchParams?.get("code")?.trim().toUpperCase() ?? "";

  useEffect(() => {
    let isMounted = true;

    const ensureSignedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (user) {
        setAuthChecked(true);
        return;
      }

      const redirectTo = `/brobot-decks/link?code=${encodeURIComponent(linkCode)}`;
      router.replace(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
    };

    void ensureSignedIn();

    return () => {
      isMounted = false;
    };
  }, [linkCode, router, supabase]);

  async function handleApprove() {
    if (!linkCode) {
      setErrorMessage("Missing link code. Return to Anki and start the link flow again.");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/brobot-anki/auth/approve-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkCode }),
      });

      const json = (await response.json().catch(() => null)) as
        | { approved?: boolean; deviceName?: string; error?: string }
        | null;

      if (!response.ok || !json?.approved) {
        throw new Error(json?.error ?? "Failed to approve this device.");
      }

      setDeviceName(json.deviceName ?? "");
      setSuccessMessage(
        "Device approved. Return to Anki Desktop and wait a few seconds for linking to finish."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong while approving the device."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-6 py-16 text-[#1A1C2C]">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#ddd6c8] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          SnapOrtho x Anki
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Approve this BroBot Decks device</h1>
        <p className="mt-4 text-sm leading-6 text-[#4f5464]">
          Link code: <span className="font-semibold text-[#1A1C2C]">{linkCode || "Missing"}</span>
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4f5464]">
          Approving this lets your Anki add-on pull your pending BroBot study plans and report study
          sessions back to your SnapOrtho account.
        </p>

        {deviceName ? (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Approved for device: {deviceName}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting || !linkCode}
            className="rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Approving..." : "Approve Device"}
          </button>
          <Link
            href="/brobot-decks"
            className="rounded-full border border-[#d5d0c2] px-5 py-3 text-sm font-semibold text-[#1A1C2C] transition hover:bg-[#f7f5ef]"
          >
            Back to BroBot Decks
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function BroBotDeckLinkPage() {
  return (
    <Suspense fallback={null}>
      <BroBotDeckLinkPageContent />
    </Suspense>
  );
}
