"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

type OnboardingFormClientProps = {
  initialSession: Session | null;
};

export default function OnboardingFormClient({
  initialSession,
}: OnboardingFormClientProps) {
  const router = useRouter();
  const user = initialSession?.user ?? null;

  const initialFullName = useMemo(() => {
    const metadata = user?.user_metadata;
    if (!metadata || typeof metadata !== "object") return "";

    if (typeof metadata.full_name === "string") return metadata.full_name;
    if (typeof metadata.name === "string") return metadata.name;

    return "";
  }, [user]);

  const initialEmail = user?.email ?? "";

  const [fullName, setFullName] = useState(initialFullName);
  const [email] = useState(initialEmail);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [trainingLevel, setTrainingLevel] = useState("");
  const [institution, setInstitution] = useState("");
  const [subspecialtyInterest, setSubspecialtyInterest] = useState("");
  const [pgyYear, setPgyYear] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [receiveEmails, setReceiveEmails] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          email: email.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          training_level: trainingLevel.trim() || null,
          institution: institution.trim() || null,
          subspecialty_interest: subspecialtyInterest.trim() || null,
          pgy_year: pgyYear.trim() ? Number(pgyYear) : null,
          grad_year: gradYear.trim() ? Number(gradYear) : null,
          receive_emails: receiveEmails,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save onboarding.");
      }

      router.push("/work");
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save onboarding."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Finish onboarding so we can create your user profile.
        </p>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Your full name"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="City"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="Country"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Training level
          </label>
          <input
            type="text"
            value={trainingLevel}
            onChange={(e) => setTrainingLevel(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="PGY-1, PGY-2, Fellow"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              PGY year
            </label>
            <input
              type="number"
              value={pgyYear}
              onChange={(e) => setPgyYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="1"
              min={0}
              max={10}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Graduation year
            </label>
            <input
              type="number"
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="2030"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Institution
          </label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Hospital or university"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Subspecialty interest
          </label>
          <input
            type="text"
            value={subspecialtyInterest}
            onChange={(e) => setSubspecialtyInterest(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Trauma, Sports, Spine, Hand"
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <input
            type="checkbox"
            checked={receiveEmails}
            onChange={(e) => setReceiveEmails(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-slate-700">
            Receive emails and updates.
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Complete onboarding"}
        </button>
      </form>
    </div>
  );
}