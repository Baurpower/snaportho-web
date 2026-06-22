export default function CasePrepReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Internal
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-sm font-medium text-gray-700">CasePrep Review Portal</span>
        </div>
      </div>
      {children}
    </div>
  );
}
