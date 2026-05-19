export default function SkeletonCard() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card animate-pulse">
      <div className="aspect-video w-full bg-input" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-24 rounded bg-input" />
        <div className="h-6 w-4/5 rounded bg-input" />
        <div className="h-4 w-full rounded bg-input" />
        <div className="h-4 w-5/6 rounded bg-input" />
      </div>
      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <div className="h-4 w-24 rounded bg-input" />
        <div className="h-8 w-8 rounded-full bg-input" />
      </div>
    </div>
  );
}
