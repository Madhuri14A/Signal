type EmptyStateProps = {
  title?: string;
  message?: string;
};

export default function EmptyState({
  title = 'No signals detected yet in this niche.',
  message = 'Check back soon.',
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-input text-xl text-muted">
        🛰️
      </div>
      <p className="text-lg text-muted">{title}</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}
