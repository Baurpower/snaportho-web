"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatAnkiLinkCode,
  isValidAnkiLinkCode,
  normalizeAnkiLinkCode,
} from "@/lib/brobot-anki/link-code";
import { createClient } from "@/utils/supabase/client";

export function AnkiDeviceLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const queryCode = normalizeAnkiLinkCode(searchParams?.get("code") ?? "");
  const [authChecked, setAuthChecked] = useState(false);
  const [inputCode, setInputCode] = useState(queryCode);
  const [activeCode, setActiveCode] = useState(queryCode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deviceName, setDeviceName] = useState("");

  useEffect(() => {
    let isMounted = true;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      if (user) return setAuthChecked(true);
      const redirectTo = queryCode
        ? `/anki/link?code=${encodeURIComponent(queryCode)}`
        : "/anki/link";
      router.replace(
        `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`,
      );
    });
    return () => {
      isMounted = false;
    };
  }, [queryCode, router, supabase]);

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeAnkiLinkCode(inputCode);
    if (!isValidAnkiLinkCode(normalized)) {
      setErrorMessage("Enter the 10-character code shown in Anki.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    setDeviceName("");
    setActiveCode(normalized);
    setInputCode(normalized);
    router.replace(`/anki/link?code=${encodeURIComponent(normalized)}`);
  }

  async function handleApprove() {
    if (!isValidAnkiLinkCode(activeCode)) {
      setErrorMessage("Enter the 10-character code shown in Anki.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/brobot-anki/auth/approve-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkCode: activeCode }),
      });
      const json = (await response.json().catch(() => null)) as {
        approved?: boolean;
        deviceName?: string;
        error?: string;
      } | null;
      if (!response.ok || !json?.approved)
        throw new Error(json?.error ?? "Failed to approve this device.");
      setDeviceName(json.deviceName ?? "SnapOrtho Anki");
      setSuccessMessage(
        "Device approved. Return to Anki Desktop; linking should finish automatically.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while approving the device.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) return null;
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-6 py-16 text-[#1A1C2C]">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#ddd6c8] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          SnapOrtho x Anki
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Link Anki Desktop</h1>
        <p className="mt-4 text-sm leading-6 text-[#4f5464]">
          Enter the temporary code shown in Anki. Codes expire after 15 minutes
          and can only be used once.
        </p>
        <form className="mt-6" onSubmit={handleCodeSubmit}>
          <label htmlFor="anki-link-code" className="text-sm font-semibold">
            Link code
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="anki-link-code"
              value={formatAnkiLinkCode(inputCode)}
              onChange={(event) =>
                setInputCode(
                  normalizeAnkiLinkCode(event.target.value).slice(0, 10),
                )
              }
              autoCapitalize="characters"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="A1B2C-3D4E5"
              className="min-w-0 flex-1 rounded-xl border border-[#c8c2b5] px-4 py-3 font-mono text-lg font-semibold uppercase tracking-[0.12em] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              className="rounded-full border border-[#d5d0c2] px-5 py-3 text-sm font-semibold transition hover:bg-[#f7f5ef]"
            >
              Use code
            </button>
          </div>
        </form>
        {activeCode && isValidAnkiLinkCode(activeCode) ? (
          <div className="mt-6 rounded-2xl border border-[#ddd6c8] bg-[#faf9f5] p-4">
            <p className="text-sm text-[#4f5464]">Approve this request?</p>
            <p className="mt-1 font-mono text-xl font-semibold tracking-[0.12em]">
              {formatAnkiLinkCode(activeCode)}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#4f5464]">
              This links the pending “SnapOrtho Anki” request to your account.
              Only approve a code you can currently see in Anki Desktop.
            </p>
          </div>
        ) : null}
        {deviceName ? (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Approved for device: {deviceName}
          </div>
        ) : null}
        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
          >
            {successMessage}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={
              submitting ||
              !isValidAnkiLinkCode(activeCode) ||
              Boolean(successMessage)
            }
            className="rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Approving..." : "Approve Device"}
          </button>
          <Link
            href="/brobot-decks"
            className="rounded-full border border-[#d5d0c2] px-5 py-3 text-sm font-semibold transition hover:bg-[#f7f5ef]"
          >
            Back to BroBot Decks
          </Link>
        </div>
      </div>
    </main>
  );
}
