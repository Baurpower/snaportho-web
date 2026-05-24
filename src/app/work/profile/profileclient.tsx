"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Building2,
  Globe,
  GraduationCap,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Save,
  Sparkles,
  UserRound,
  X,
  MapPin,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";
import { buildPasswordResetRedirectUrl } from "@/lib/auth/password-reset";

type ProfileForm = {
  full_name: string;
  email: string;
  city: string;
  country: string;
  institution: string;
  subspecialty_interest: string;
  grad_year: string;
  receive_emails: boolean;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function getAcademicStartYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  return month >= 6 ? year : year - 1; // July 1 rollover
}

function getPgyPreviewFromGradYear(gradYear: number | null | undefined) {
  if (!gradYear) return null;

  const academicStartYear = getAcademicStartYear();
  const pgy = academicStartYear - gradYear + 6;

  if (pgy < 0 || pgy > 10) return null;
  return pgy;
}

function getPgyOneStartDateFromGradYear(gradYear: number | null | undefined) {
  if (!gradYear) return null;
  const startYear = gradYear - 5;
  return new Date(startYear, 6, 1); // July 1
}

function formatLongDate(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getPgyDisplayLabel(gradYear: number | null | undefined) {
  const pgy = getPgyPreviewFromGradYear(gradYear);
  if (pgy === null) return null;
  return `PGY-${pgy}`;
}

function getPgyHelperText(gradYear: number | null | undefined) {
  const pgy = getPgyPreviewFromGradYear(gradYear);
  if (pgy === null) return "Enter your graduation year to preview your current PGY.";

  if (pgy === 0) {
    const startDate = formatLongDate(getPgyOneStartDateFromGradYear(gradYear));
    return startDate ? `PGY-1 starts ${startDate}.` : "PGY-1 start date unavailable.";
  }

  return "Calculated automatically from your graduation year using a July 1 academic-year rollover.";
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-sky-300">{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {value && value.trim() !== "" ? value : "Not added yet"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_50px_rgba(2,8,23,0.18)] backdrop-blur md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/10">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {helperText ? (
        <p className="mt-2 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

function HeroBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
      {label}
    </span>
  );
}

function formatRoleLabel(role: string | null | undefined) {
  if (!role) return "Not assigned";

  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function WorkProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { workspaceInfo } = useWorkspaceInfo();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    email: "",
    city: "",
    country: "",
    institution: "",
    subspecialty_interest: "",
    grad_year: "",
    receive_emails: false,
  });

  const [originalForm, setOriginalForm] = useState<ProfileForm>({
    full_name: "",
    email: "",
    city: "",
    country: "",
    institution: "",
    subspecialty_interest: "",
    grad_year: "",
    receive_emails: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMsg(null);
        setMessage(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/work/welcome");
          return;
        }

        if (cancelled) return;
        setUserId(user.id);
        setAuthEmail(user.email ?? null);

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select(
            "full_name, email, city, country, institution, subspecialty_interest, grad_year, receive_emails"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        const nextForm: ProfileForm = {
          full_name: profile?.full_name ?? "",
          email: profile?.email ?? user.email ?? "",
          city: profile?.city ?? "",
          country: profile?.country ?? "",
          institution: profile?.institution ?? "",
          subspecialty_interest: profile?.subspecialty_interest ?? "",
          grad_year:
            profile?.grad_year !== null && profile?.grad_year !== undefined
              ? String(profile.grad_year)
              : "",
          receive_emails: profile?.receive_emails ?? false,
        };

        setForm(nextForm);
        setOriginalForm(nextForm);
      } catch (error) {
        setErrorMsg(
          error instanceof Error ? error.message : "Failed to load profile."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancelEdit() {
    setForm(originalForm);
    setIsEditing(false);
    setMessage(null);
    setErrorMsg(null);
  }

  async function handleSave() {
    if (!userId) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      setMessage(null);

      const trimmedFullName = form.full_name.trim();
      const trimmedEmail = form.email.trim();

      if (!hasRosterManagedName && trimmedFullName.length < 2) {
        throw new Error("Please enter your full name.");
      }

      if (trimmedEmail.length < 3) {
        throw new Error("Please enter a valid email.");
      }

      const gradYear =
        form.grad_year.trim() === "" ? null : Number.parseInt(form.grad_year, 10);

      if (form.grad_year.trim() !== "" && Number.isNaN(gradYear)) {
        throw new Error("Graduation year must be a number.");
      }

      const payload = {
        user_id: userId,
        full_name: trimmedFullName,
        email: trimmedEmail,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        institution: form.institution.trim() || null,
        subspecialty_interest: form.subspecialty_interest.trim() || null,
        grad_year: gradYear,
        receive_emails: form.receive_emails,
        is_profile_complete: true,
      };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      setOriginalForm(form);
      setMessage("Profile updated.");
      setIsEditing(false);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setErrorMsg(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.replace("/work/welcome");
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to log out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const initials = useMemo(() => {
    const trimmed =
      workspaceInfo?.roster?.fullName?.trim() || form.full_name.trim();
    if (!trimmed) return "SO";
    const parts = trimmed.split(" ").filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }, [form.full_name, workspaceInfo?.roster?.fullName]);

  const profileGradYearNumber = useMemo(() => {
    if (!form.grad_year.trim()) return null;
    const parsed = Number.parseInt(form.grad_year, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [form.grad_year]);

  const effectiveDisplayName = useMemo(() => {
    const rosterName = workspaceInfo?.roster?.fullName?.trim();
    const profileName = form.full_name.trim();

    return rosterName || profileName || "Your profile";
  }, [form.full_name, workspaceInfo?.roster?.fullName]);

  const effectiveGradYear = useMemo(() => {
    return workspaceInfo?.roster?.gradYear ?? profileGradYearNumber;
  }, [profileGradYearNumber, workspaceInfo?.roster?.gradYear]);

  const pgyDisplayLabel = useMemo(
    () => getPgyDisplayLabel(effectiveGradYear),
    [effectiveGradYear]
  );

  const pgyHelperText = useMemo(
    () => getPgyHelperText(effectiveGradYear),
    [effectiveGradYear]
  );

  const rosterRoleLabel = useMemo(
    () => formatRoleLabel(workspaceInfo?.roster?.role),
    [workspaceInfo?.roster?.role]
  );
  const hasRosterManagedName = Boolean(workspaceInfo?.roster?.fullName?.trim());
  const hasRosterManagedGradYear =
    typeof workspaceInfo?.roster?.gradYear === "number";

  async function handleResetPassword() {
    try {
      setSendingReset(true);
      setErrorMsg(null);
      setMessage(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authEmail = user?.email?.trim();

      if (!authEmail) {
        throw new Error("No authenticated email is available for password reset.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: buildPasswordResetRedirectUrl("/work/profile"),
      });

      if (error) throw error;

      setMessage(`Password reset link sent to ${authEmail}.`);
    } catch (error) {
      console.error("Failed to send workspace password reset email:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to send password reset email."
      );
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071120] text-white">
      <section className="px-6 py-12 sm:px-8 md:py-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto max-w-5xl"
        >
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
              Workspace profile
            </div>

            <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Your profile
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                  Review your account details, training information, and profile
                  preferences across SnapOrtho Workspace.
                </p>
              </div>

              {!loading ? (
                !isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setErrorMsg(null);
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit profile
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save changes
                    </button>
                  </div>
                )
              ) : null}
            </div>
          </div>

          {errorMsg ? (
            <div className="mb-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMsg}
            </div>
          ) : null}

          {message ? (
            <div className="mb-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] px-5 py-6 text-sm text-slate-300">
              Loading profile…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-[0_24px_70px_rgba(2,8,23,0.22)]">
                <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-7">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-sky-400/10 text-2xl font-black text-sky-200 ring-1 ring-sky-300/15">
                      {initials}
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        {effectiveDisplayName}
                      </h2>

                      <p className="mt-1 text-sm text-slate-300">
                        {form.email || "No email added"}
                      </p>

                      {form.institution ? (
                        <p className="mt-2 text-sm text-slate-400">
                          {form.institution}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {workspaceInfo?.roster?.role ? (
                      <HeroBadge label={rosterRoleLabel} />
                    ) : null}

                    {workspaceInfo?.roster?.isAdmin ? (
                      <HeroBadge label="Admin" />
                    ) : null}

                    {pgyDisplayLabel ? (
                      <HeroBadge label={pgyDisplayLabel} />
                    ) : null}

                    {effectiveGradYear ? (
                      <HeroBadge label={`Class of ${effectiveGradYear}`} />
                    ) : null}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <SectionShell
                  title="Edit profile"
                  subtitle="Update your core account details. Current PGY is previewed automatically from graduation year."
                  icon={<UserRound className="h-5 w-5" />}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Full name"
                      value={hasRosterManagedName ? effectiveDisplayName : form.full_name}
                      onChange={(value) => updateField("full_name", value)}
                      placeholder="Your full name"
                      disabled={hasRosterManagedName}
                      helperText={
                        hasRosterManagedName
                          ? "This name is currently managed by your active workspace roster."
                          : undefined
                      }
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(value) => updateField("email", value)}
                      placeholder="Your email"
                    />

                    <Input
                      label="Graduation year"
                      type="number"
                      value={
                        hasRosterManagedGradYear
                          ? String(workspaceInfo?.roster?.gradYear ?? "")
                          : form.grad_year
                      }
                      onChange={(value) => updateField("grad_year", value)}
                      placeholder="2031"
                      disabled={hasRosterManagedGradYear}
                      helperText={
                        hasRosterManagedGradYear
                          ? "This graduation year is currently managed by your active workspace roster."
                          : undefined
                      }
                    />

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Current PGY preview
                      </label>
                      <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                        {pgyDisplayLabel ?? "Shown when a graduation year is available"}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{pgyHelperText}</p>
                    </div>

                    <Input
                      label="Institution"
                      value={form.institution}
                      onChange={(value) => updateField("institution", value)}
                      placeholder="Hospital or university"
                    />
                    <Input
                      label="City"
                      value={form.city}
                      onChange={(value) => updateField("city", value)}
                      placeholder="City"
                    />
                    <Input
                      label="Country"
                      value={form.country}
                      onChange={(value) => updateField("country", value)}
                      placeholder="Country"
                    />

                    <div className="md:col-span-2">
                      <Input
                        label="Subspecialty interest"
                        value={form.subspecialty_interest}
                        onChange={(value) =>
                          updateField("subspecialty_interest", value)
                        }
                        placeholder="Trauma, Sports, Spine, Hand"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={form.receive_emails}
                          onChange={(e) =>
                            updateField("receive_emails", e.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10"
                        />
                        <span>
                          Receive emails and updates from SnapOrtho.
                        </span>
                      </label>
                    </div>
                  </div>
                </SectionShell>
              ) : (
                <>
                  <SectionShell
                    title="Training"
                    subtitle="Your program and year details."
                    icon={<GraduationCap className="h-5 w-5" />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoRow
                        label="Institution"
                        value={form.institution}
                        icon={<Building2 className="h-4 w-4" />}
                      />
                      {pgyDisplayLabel ? (
                        <InfoRow
                          label="Current PGY"
                          value={pgyDisplayLabel}
                          icon={<GraduationCap className="h-4 w-4" />}
                        />
                      ) : null}
                      {effectiveGradYear ? (
                        <InfoRow
                          label="Graduation year"
                          value={String(effectiveGradYear)}
                          icon={<Sparkles className="h-4 w-4" />}
                        />
                      ) : null}
                    </div>

                    {effectiveGradYear ? (
                      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          PGY timing
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {pgyHelperText}
                        </p>
                      </div>
                    ) : null}
                  </SectionShell>

                  <SectionShell
                    title="Location and interests"
                    subtitle="Optional details that help personalize your profile."
                    icon={<MapPin className="h-5 w-5" />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoRow
                        label="City"
                        value={form.city}
                        icon={<MapPin className="h-4 w-4" />}
                      />
                      <InfoRow
                        label="Country"
                        value={form.country}
                        icon={<Globe className="h-4 w-4" />}
                      />
                      <div className="md:col-span-2">
                        <InfoRow
                          label="Subspecialty interest"
                          value={form.subspecialty_interest}
                          icon={<Sparkles className="h-4 w-4" />}
                        />
                      </div>
                      <div className="md:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Email updates
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {form.receive_emails ? "Subscribed" : "Not subscribed"}
                        </p>
                      </div>
                    </div>
                  </SectionShell>
                </>
              )}

              <SectionShell
                title="Security"
                subtitle="Manage account access separately from your profile and training details."
                icon={<KeyRound className="h-5 w-5" />}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Reset password
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Send a password reset link to your authenticated email.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      {authEmail || "Signed-in account"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={sendingReset || loading}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingReset ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Reset password
                  </button>
                </div>
              </SectionShell>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Log out
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
}
