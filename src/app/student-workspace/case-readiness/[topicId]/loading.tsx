export default function CaseReadinessLoading() {
  return (
    <div className="grid gap-5">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-2/3 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          <div className="h-28 rounded-[1.5rem] border border-slate-200 bg-white" />
          <div className="h-28 rounded-[1.5rem] border border-slate-200 bg-white" />
          <div className="h-28 rounded-[1.5rem] border border-slate-200 bg-white" />
        </div>
        <div className="h-48 rounded-[1.5rem] border border-slate-200 bg-white" />
      </div>
      <p className="sr-only">Loading case readiness session</p>
    </div>
  );
}