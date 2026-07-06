function PrepareSkeletonCard() {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-24 rounded-full bg-slate-200" />
      <div className="mt-4 h-8 w-2/3 rounded-full bg-slate-200" />
      <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
      <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100" />
      <div className="mt-5 h-12 w-full rounded-2xl bg-slate-100" />
    </div>
  );
}

export default function PrepareLoading() {
  return (
    <div className="grid gap-6">
      <PrepareSkeletonCard />
      <PrepareSkeletonCard />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PrepareSkeletonCard />
        <PrepareSkeletonCard />
        <PrepareSkeletonCard />
      </div>
      <p className="sr-only">Loading Prepare curriculum</p>
    </div>
  );
}