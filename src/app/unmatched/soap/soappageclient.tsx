"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Phone,
  ShieldCheck,
  Sparkles,
  Stars,
} from "lucide-react";
import type React from "react";

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-24">{children}</div>;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "bg-white rounded-2xl shadow-md border border-gray-200/80 " +
        "transition-transform will-change-transform hover:shadow-lg " +
        className
      }
    >
      {children}
    </div>
  );
}

type CardSectionProps = {
  children: React.ReactNode;
  className?: string;
};

function CardHeader({ children, className = "" }: CardSectionProps) {
  return <div className={"p-6 " + className}>{children}</div>;
}

function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h3 className={"text-base font-semibold text-[#333] " + className}>{children}</h3>;
}

function CardContent({ children, className = "" }: CardSectionProps) {
  return <div className={"px-6 pb-6 " + className}>{children}</div>;
}

function Button({
  children,
  className = "",
  variant = "solid",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
  size?: "sm" | "md";
}) {
  const sizes =
    size === "sm" ? "px-4 py-2 text-sm rounded-xl" : "px-5 py-2.5 text-sm rounded-xl";
  const base =
    "inline-flex items-center gap-2 font-medium transition-colors focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#597498]";
  const styles =
    variant === "outline"
      ? "border border-gray-300 bg-white text-[#444] hover:bg-gray-50"
      : "bg-[#597498] text-white hover:bg-[#4e6886]";
  return (
    <button {...props} className={`${base} ${sizes} ${styles} ${className}`}>
      {children}
    </button>
  );
}

function Badge({
  children,
  className = "",
  variant = "secondary",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "secondary" | "primary" | "warning";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#597498]/10 text-[#597498] border border-[#597498]/20"
      : variant === "warning"
        ? "bg-amber-50 text-amber-700 border border-amber-200"
        : "bg-gray-100 text-gray-700 border border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${styles} ${className}`}>
      {children}
    </span>
  );
}

function Separator() {
  return <hr className="border-gray-200/80" />;
}

const QUICK_FACTS = [
  "You must be registered for the Main Residency Match.",
  "You must be eligible to start graduate medical education by July 1, 2026.",
  "You must be unmatched or partially matched on Monday of Match Week.",
  "There is no separate SOAP registration or fee through NRMP.",
];

const TIMELINE = [
  {
    day: "Monday, March 16",
    badge: "10:00 AM ET",
    label: "Learn your Match status and, if SOAP-eligible, access the List of Unfilled Programs in NRMP R3.",
  },
  {
    day: "Monday, March 16",
    badge: "11:00 AM ET",
    label: "Begin submitting applications in the program-designated application service.",
  },
  {
    day: "Tuesday, March 17",
    badge: "8:00 AM ET",
    label: "Programs may begin reviewing applications and reaching out to applicants.",
  },
  {
    day: "Wednesday, March 18",
    badge: "All Day",
    label: "Applicants may continue applying to programs using any remaining applications.",
  },
  {
    day: "Thursday, March 19",
    badge: "9:00 AM ET",
    label: "SOAP Offer Round 1 begins.",
  },
  {
    day: "Thursday, March 19",
    badge: "11:00 AM ET",
    label: "Offer Round 1 ends. Unaccepted offers expire.",
  },
  {
    day: "Thursday, March 19",
    badge: "12:00 PM ET",
    label: "Offer Round 2 begins.",
  },
  {
    day: "Thursday, March 19",
    badge: "2:00 PM ET",
    label: "Offer Round 2 ends.",
  },
  {
    day: "Thursday, March 19",
    badge: "3:00 PM ET",
    label: "Offer Round 3 begins.",
  },
  {
    day: "Thursday, March 19",
    badge: "5:00 PM ET",
    label: "Offer Round 3 ends.",
  },
  {
    day: "Thursday, March 19",
    badge: "6:00 PM ET",
    label: "Offer Round 4 begins.",
  },
  {
    day: "Thursday, March 19",
    badge: "8:00 PM ET",
    label: "Offer Round 4 ends.",
  },
  {
    day: "Thursday, March 19",
    badge: "9:00 PM ET",
    label: "SOAP ends. The post-SOAP unfilled list becomes available for unmatched and partially matched applicants.",
  },
];

const STRATEGY_CARDS = [
  {
    title: "Before Monday",
    icon: <ShieldCheck className="h-5 w-5" />,
    points: [
      "Have your personal statement, CV, transcript access, and letters ready before Match Week.",
      "Review realistic backup specialties and prelim options ahead of time.",
      "Know which application service each target specialty uses.",
    ],
  },
  {
    title: "When the list opens",
    icon: <FileText className="h-5 w-5" />,
    points: [
      "Use the NRMP R3 list as your source of truth for program eligibility.",
      "Apply strategically because most SOAP positions fill early.",
      "Do not waste applications on programs you are not eligible for or would never realistically accept.",
    ],
  },
  {
    title: "When programs contact you",
    icon: <Phone className="h-5 w-5" />,
    points: [
      "Be reachable by phone and email at all times.",
      "Keep your responses calm, direct, and enthusiastic.",
      "Have a concise explanation for why you are interested in that program or specialty.",
    ],
  },
  {
    title: "During offer rounds",
    icon: <Clock3 className="h-5 w-5" />,
    points: [
      "Each SOAP offer round lasts two hours.",
      "You can receive multiple offers in the same round.",
      "Rejected or expired offers will not come back to you in a later round.",
    ],
  },
];

const RULES = [
  "Applicants and their representatives cannot initiate contact with a program until the program has received the application and reaches out first.",
  "Applicants cannot share, post, or make publicly available the List of Unfilled Programs.",
  "Applicants do not submit a rank list or preference list during SOAP.",
  "Offers accepted during SOAP are binding under the NRMP Match Participation Agreement.",
];

const SERVICES = [
  {
    title: "ERAS",
    details: [
      "Used by most Match-participating specialties other than Emergency Medicine, EM combined specialties, and OB/GYN.",
      "Applicants can apply to up to 45 ERAS-participating programs during SOAP.",
      "Applications cannot be withdrawn after submission.",
    ],
  },
  {
    title: "ResidencyCAS",
    details: [
      "Used for Emergency Medicine, EM combined specialties, and Obstetrics and Gynecology.",
      "Applicants can apply to up to 45 ResidencyCAS-participating programs during SOAP.",
      "Applications cannot be withdrawn after submission.",
    ],
  },
];

const PITFALLS = [
  "Panic-applying without checking eligibility.",
  "Breaking NRMP communication rules by contacting programs first.",
  "Ignoring phone calls or email during SOAP.",
  "Waiting too long to decide during an offer round.",
  "Assuming an expired offer will return in a later round.",
];

const FAQS = [
  {
    question: "Who is eligible for SOAP?",
    answer:
      "To participate, you must be registered for the Main Residency Match, eligible to begin graduate medical education by July 1, 2026, and unmatched or partially matched on Monday of Match Week.",
  },
  {
    question: "Can I call or email programs first?",
    answer:
      "No. Applicants and their representatives are not allowed to initiate communication with programs until a program has received the application and contacts the applicant or representative first.",
  },
  {
    question: "How many applications do I get?",
    answer:
      "You can submit up to 45 applications in each participating application service during SOAP.",
  },
  {
    question: "Do I rank programs in SOAP?",
    answer:
      "No. Programs create preference lists in R3, but applicants do not submit a rank list or preference list during SOAP.",
  },
  {
    question: "What happens if I do not respond to an offer?",
    answer:
      "The offer expires automatically at the end of that round and cannot be offered to you again in a later SOAP round.",
  },
];

export default function SOAPPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1f2937]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute left-1/2 top-[-10%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.15),transparent_60%)] blur-2xl"
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-[#f9f7f4]/80 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 text-[#444]">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium tracking-tight">SnapOrtho · SOAP</span>
            </div>
            <nav className="hidden gap-6 text-sm sm:flex">
              <a className="hover:underline" href="#timeline">Timeline</a>
              <a className="hover:underline" href="#strategy">Strategy</a>
              <a className="hover:underline" href="#rules">Rules</a>
              <a className="hover:underline" href="#faq">FAQ</a>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </nav>
          </div>
        </Container>
      </header>

      <section className="relative py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="text-4xl sm:text-5xl font-bold tracking-tight text-[#444]"
              >
                Guide to <span className="text-[#597498]">SOAP</span> for Ortho Applicants
              </motion.h1>
              <p className="mt-4 text-gray-600 leading-relaxed">
                A calm, strategic guide to navigating SOAP during Match Week—who is eligible,
                what the timeline looks like, how offer rounds work, and what mistakes to avoid.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="sm" className="gap-2">
                  <a href="#timeline" className="inline-flex items-center gap-2">
                    View timeline <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="sm" variant="outline">
                  <a href="#faq">SOAP FAQ</a>
                </Button>
              </div>
            </div>

            <Card className="bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stars className="h-5 w-5 text-[#597498]" />
                  SOAP Quick Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm text-gray-600">
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="font-medium text-[#333]">Unfilled list opens</div>
                    <div className="mt-1">Monday, March 16 at 10:00 AM ET</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="font-medium text-[#333]">Applications open</div>
                    <div className="mt-1">Monday, March 16 at 11:00 AM ET</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="font-medium text-[#333]">Offer rounds</div>
                    <div className="mt-1">Four rounds on Thursday, March 19</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="font-medium text-[#333]">High-yield reality</div>
                    <div className="mt-1">Nearly 60% of positions fill in Round 1 and about 80% by the end of Round 2.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <Separator />

      <section className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Eligibility
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Who can participate in SOAP?
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {QUICK_FACTS.map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#597498]" />
                  <p className="text-sm text-gray-600">{fact}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <Separator />

      <section id="timeline" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Timeline
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Key SOAP dates and events
            </h2>
          </div>

          <div className="grid gap-4">
            {TIMELINE.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{item.day}</Badge>
                    <Badge variant="primary">{item.badge}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 sm:max-w-[68%]">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <Separator />

      <section id="strategy" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Strategy
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              How to approach SOAP well
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {STRATEGY_CARDS.map((sec, i) => (
              <Card key={i} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(89,116,152,0.12),transparent_60%)]" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-[#597498]">{sec.icon}</span>
                    {sec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {sec.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#597498]/60" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-[#597498]" />
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  <span className="font-medium text-[#333]">SnapOrtho perspective:</span> SOAP goes best when your decisions are made before the chaos starts. Know what specialties, regions, and prelim structures you would realistically accept.
                </p>
                <p>Move quickly, but do not move blindly.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Separator />

      <section className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Application Services
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Where SOAP applications are submitted
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {SERVICES.map((service, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {service.details.map((detail, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#597498]/60" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <Separator />

      <section id="rules" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              Rules & Pitfalls
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Rules you cannot afford to miss
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Core SOAP rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                {RULES.map((rule, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                    {rule}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common pitfalls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                {PITFALLS.map((pitfall, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
                    <Badge variant="warning" className="shrink-0">{i + 1}</Badge>
                    <span>{pitfall}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      <Separator />

      <section id="faq" className="py-14">
        <Container>
          <div className="mb-6">
            <div className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
              FAQ
            </div>
            <h2 className="text-3xl font-semibold text-[#444] tracking-tight">
              Common SOAP questions
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Quick answers to the questions applicants ask most during Match Week.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-sm font-medium text-[#333]">{faq.question}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-3 text-sm text-gray-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <footer className="border-t border-gray-200/80 bg-[#f9f7f4] py-10">
        <Container>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center gap-2 text-[#597498] font-medium text-sm tracking-wide uppercase">
              <Sparkles className="h-4 w-4" />
              Built for clarity during Match Week
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="max-w-3xl text-gray-700 text-sm sm:text-base leading-relaxed">
              This SOAP page is designed to give applicants a cleaner, calmer view of the process so they can make good decisions under pressure.
            </p>
            <p className="text-sm text-gray-500">Wishing you the best of luck during Match Week.</p>
          </div>
        </Container>
      </footer>
    </main>
  );
}
