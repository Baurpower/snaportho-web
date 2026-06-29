function LoadingCard({ title }: { title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-3 w-24 rounded-full bg-slate-200" />
      <div className="mt-4 h-6 w-2/3 rounded-full bg-slate-200" />
      <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
      <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100" />
      <div className="mt-5 h-4 w-28 rounded-full bg-slate-100" />
      <p className="sr-only">{title}</p>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="grid gap-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="h-5 w-32 rounded-full bg-slate-100" />
        <div className="mt-4 h-10 w-2/3 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard title="Loading Student Workspace progress" />
        <LoadingCard title="Loading Student Workspace schedule" />
        <LoadingCard title="Loading Student Workspace checklist" />
        <LoadingCard title="Loading Student Workspace tasks" />
        <LoadingCard title="Loading Student Workspace rotations" />
      </div>
    </div>
  );
}
