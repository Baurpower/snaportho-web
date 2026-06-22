"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { RegistryIndex, ProcedureSummary } from "@/lib/caseprep-review/types";
import { CasePrepStatusBadge } from "./CasePrepStatusBadge";

interface CasePrepReviewDashboardProps {
  data: RegistryIndex;
  reviewerRole: string;
  reviewerName: string | null;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 bg-white shadow-sm ${color}`}>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ProcedureRow({ p }: { p: ProcedureSummary }) {
  const coveragePct = Math.round((p.coverage_score ?? 0) * 100);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{p.display_name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {p.specialty}
          {p.body_region ? ` · ${p.body_region}` : ""}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <CasePrepStatusBadge value={p.content_status} variant="content_status" />
        <CasePrepStatusBadge value={p.review_status} variant="review_status" />
        {p.is_live && <CasePrepStatusBadge value="Live" variant="live" />}
        <span className="text-xs text-gray-500 font-medium w-12 text-right">
          {coveragePct}%
        </span>
        <Link
          href={`/admin/caseprep-review/${encodeURIComponent(p.slug)}`}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

export function CasePrepReviewDashboard({
  data,
  reviewerRole,
  reviewerName,
}: CasePrepReviewDashboardProps) {
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterBodyRegion, setFilterBodyRegion] = useState("");
  const [filterContentStatus, setFilterContentStatus] = useState("");
  const [filterReviewStatus, setFilterReviewStatus] = useState("");

  const procedures = useMemo(() => data.procedures ?? [], [data.procedures]);

  const specialties = useMemo(
    () => [...new Set(procedures.map((p) => p.specialty).filter(Boolean))].sort(),
    [procedures]
  );
  const bodyRegions = useMemo(
    () => [...new Set(procedures.map((p) => p.body_region).filter(Boolean))].sort(),
    [procedures]
  );
  const contentStatuses = useMemo(
    () => [...new Set(procedures.map((p) => p.content_status).filter(Boolean))].sort(),
    [procedures]
  );
  const reviewStatuses = useMemo(
    () => [...new Set(procedures.map((p) => p.review_status).filter(Boolean))].sort(),
    [procedures]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return procedures.filter((p) => {
      if (q && !p.display_name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q))
        return false;
      if (filterSpecialty && p.specialty !== filterSpecialty) return false;
      if (filterBodyRegion && p.body_region !== filterBodyRegion) return false;
      if (filterContentStatus && p.content_status !== filterContentStatus) return false;
      if (filterReviewStatus && p.review_status !== filterReviewStatus) return false;
      return true;
    });
  }, [procedures, search, filterSpecialty, filterBodyRegion, filterContentStatus, filterReviewStatus]);

  const totalCount = procedures.length;
  const certifiedCount = data.counts_by_content_status?.["certified"] ?? 0;
  const partialCount = data.counts_by_content_status?.["partial"] ?? 0;
  const missingCount = data.counts_by_content_status?.["missing"] ?? 0;
  const liveCount = procedures.filter((p) => p.is_live).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CasePrep Content Review</h1>
          {reviewerName && (
            <p className="text-sm text-gray-500 mt-0.5">Welcome, {reviewerName}</p>
          )}
        </div>
        <CasePrepStatusBadge value={reviewerRole} variant="role" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Total Procedures" value={totalCount} color="border-gray-200" />
        <SummaryCard label="Certified" value={certifiedCount} color="border-green-200" />
        <SummaryCard label="Partial" value={partialCount} color="border-yellow-200" />
        <SummaryCard label="Missing" value={missingCount} color="border-red-200" />
        <SummaryCard label="Live in BroBot" value={liveCount} color="border-teal-200" />
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <input
          type="text"
          placeholder="Search by procedure name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select
            label="Specialty"
            value={filterSpecialty}
            onChange={setFilterSpecialty}
            options={specialties}
          />
          <Select
            label="Body Region"
            value={filterBodyRegion}
            onChange={setFilterBodyRegion}
            options={bodyRegions}
          />
          <Select
            label="Content Status"
            value={filterContentStatus}
            onChange={setFilterContentStatus}
            options={contentStatuses}
          />
          <Select
            label="Review Status"
            value={filterReviewStatus}
            onChange={setFilterReviewStatus}
            options={reviewStatuses}
          />
        </div>
      </div>

      {/* Procedure list */}
      <div className="space-y-3">
        <div className="text-sm text-gray-500">
          Showing {filtered.length} of {totalCount} procedures
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
            No procedures match your filters.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <ProcedureRow key={p.slug} p={p} />
            ))}
          </div>
        )}
      </div>

      {data.generated_at && (
        <div className="text-xs text-gray-400 text-right">
          Registry generated: {new Date(data.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      aria-label={label}
    >
      <option value="">All {label}s</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}
