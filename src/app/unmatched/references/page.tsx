"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

type ReferenceItem = {
  title: string;
  journal: string;
  year: string;
  description: string;
  href: string;
};

function ReferenceCard({ item }: { item: ReferenceItem }) {
  return (
    <motion.a
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
        {item.title}
      </h3>

      <p className="mt-3 text-sm font-medium text-slate-500">
        {item.journal} · {item.year}
      </p>

      <p className="mt-4 text-sm leading-7 text-slate-600 md:text-[15px]">
        {item.description}
      </p>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        Open article
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </motion.a>
  );
}

export default function UnmatchedReferencesPage() {
  const references: ReferenceItem[] = [
    {
      title: "How Should Unmatched Orthopaedic Surgery Applicants Proceed?",
      journal: "Clinical Orthopaedics and Related Research",
      year: "2012",
      href: "https://link.springer.com/article/10.1007/s11999-012-2471-8",
      description:
        "One of the earliest analyses examining how orthopaedic program leadership views unmatched applicants and whether research years or clinical internships are preferred before reapplying.",
    },
    {
      title:
        "A Comparison of Matched and Unmatched Orthopaedic Surgery Residency Applicants from 2006 to 2014",
      journal: "JBJS",
      year: "2017",
      href: "https://journals.lww.com/jbjsjournal/abstract/2017/01040/a_comparison_of_matched_and_unmatched_orthopaedic.11.aspx",
      description:
        "Compares application characteristics between matched and unmatched applicants, highlighting differences in board scores, research productivity, and application patterns.",
    },
    {
      title: "The Fate of Unmatched Orthopaedic Applicants: Risk Factors and Outcomes",
      journal: "JBJS Open Access",
      year: "2020",
      href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7418921/",
      description:
        "Examines the longer-term outcomes of applicants who initially failed to match orthopaedics, including eventual career paths and reapplication outcomes.",
    },
    {
      title:
        "Research Fellowships for Unmatched Orthopaedic Applicants: What Can They Expect?",
      journal: "JBJS Open Access",
      year: "2024",
      href: "https://journals.lww.com/jbjsoa/fulltext/2024/12000/research_fellowships_for_unmatched_orthopaedic.9.aspx",
      description:
        "Provides insight into orthopaedic research fellowships and what unmatched applicants should expect from these positions in terms of mentorship, productivity, and match outcomes.",
    },
    {
      title:
        "Reimagining the Path of an Unmatched Orthopaedic Residency Application: A Survey of Program Directors",
      journal: "JBJS Open Access",
      year: "2023",
      href: "https://journals.lww.com/jbjsoa/fulltext/2023/09000/reimagining_the_path_of_an_unmatched_orthopaedic.18.aspx",
      description:
        "A survey of orthopaedic program directors exploring how unmatched applicants are perceived and what factors may improve the chances of successfully matching in a future cycle.",
    },
    {
      title:
        "Lost in Limbo: The Unmatched Orthopaedic Applicant's Research-Year Experience",
      journal: "JBJS",
      year: "2026",
      href: "https://journals.lww.com/jbjsjournal/citation/2026/01070/lost_in_limbo__the_unmatched_orthopaedic.5.aspx",
      description:
        "A perspective piece highlighting the emotional and professional realities of the unmatched research year and the uncertainty applicants often face during this period.",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-50 text-slate-900">
      <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_20%)]" />

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 backdrop-blur">
              <BookOpen className="h-4 w-4" />
              SnapOrtho References
            </div>

            <h1 className="mt-8 text-5xl font-black tracking-tight text-white md:text-7xl">
              REFERENCES
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
              The studies and articles demonstrate the increasing number of unmatched orthopaedic applicants. Overall, these studies show that there is no one &quot;correct&quot; approach to reapplying.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {references.map((ref) => (
            <ReferenceCard key={ref.title} item={ref} />
          ))}
        </div>
      </section>
    </main>
  );
}