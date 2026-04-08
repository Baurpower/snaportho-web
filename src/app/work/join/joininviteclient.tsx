"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Layers3,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

type InvitePreview = {
  inviteId: string;
  rosterId: string;
  programId: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  gradYear: number | null;
  email: string | null;
  program: {
    id: string;
    name: string;
    institutionName?: string | null;
    city?: string | null;
    state?: string | null;
    timezone?: string | null;
  } | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-300">
      <span className="text-sky-300">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function JoinInviteClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/program/invites/preview?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.invite) {
          throw new Error(payload?.error ?? "Failed to load invite.");
        }

        if (!cancelled) {
          setInvite(payload.invite);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load invite.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const redirectTo = useMemo(
    () => `/work/onboarding?inviteToken=${encodeURIComponent(token)}`,
    [token]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071120] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_18%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <section className="relative px-6 py-16 sm:px-8 sm:py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center"
        >
          <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="max-w-2xl">
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200"
              >
                <Layers3 className="h-4 w-4" />
                SnapOrtho Workspace Invite
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl"
              >
                Join your residency workspace.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg"
              >
                View your schedule, rotations, and call in one clean place.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3">
                <Pill icon={<CalendarDays className="h-4 w-4" />} label="Weekly schedule" />
                <Pill icon={<Stethoscope className="h-4 w-4" />} label="Rotations" />
                <Pill icon={<Users className="h-4 w-4" />} label="Coverage view" />
              </motion.div>

              {loading ? (
                <motion.div
                  variants={fadeUp}
                  className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300"
                >
                  Loading invite…
                </motion.div>
              ) : error ? (
                <motion.div
                  variants={fadeUp}
                  className="mt-8 rounded-[1.5rem] border border-rose-300/20 bg-rose-400/10 p-5 text-sm text-rose-100"
                >
                  {error}
                </motion.div>
              ) : invite ? (
                <motion.div
                  variants={fadeUp}
                  className="mt-8 rounded-[1.5rem] border border-sky-300/20 bg-sky-300/10 p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                    Invite details
                  </p>
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-bold text-white">
                      {invite.fullName ?? "Invited resident"}
                    </p>
                    {invite.gradYear ? (
                      <p className="text-sm text-slate-300">Class of {invite.gradYear}</p>
                    ) : null}
                    {invite.program ? (
                      <div className="pt-1 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-sky-300" />
                          <span>{invite.program.name}</span>
                        </div>
                        {invite.program.institutionName ? (
                          <p className="mt-1 text-slate-400">{invite.program.institutionName}</p>
                        ) : null}
                        {(invite.program.city || invite.program.state) && (
                          <p className="mt-1 text-slate-400">
                            {[invite.program.city, invite.program.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}

              <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={{ pathname: "/auth/sign-in", query: { redirectTo } }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href={{ pathname: "/auth/sign-up", query: { redirectTo } }}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  Create account
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-5 flex items-start gap-2.5 text-sm text-slate-400"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p>
                  Use your existing SnapOrtho account. Your invite will connect you to the correct residency program during setup.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}