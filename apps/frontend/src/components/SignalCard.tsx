import { Link } from 'react-router-dom';
import { getNicheColor } from '../utils/niches';

type SignalCardProps = {
  id: number;
  label: string | null;
  summary: string | null;
  velocity: number;
  createdAt: string;
  niche: string;
  sourceCount: number;
  sourceNames?: string[];
  imageUrl?: string | null;
  isBookmarked?: boolean;
  bookmarkLoading?: boolean;
  onToggleBookmark?: (signalId: number) => void;
};

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'NA';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'recent';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isRising(createdAt: string): boolean {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return false;
  }

  return Date.now() - created.getTime() <= 24 * 60 * 60 * 1000;
}

export default function SignalCard({
  id,
  label,
  summary,
  velocity,
  createdAt,
  niche,
  sourceCount,
  sourceNames = [],
  imageUrl,
  isBookmarked = false,
  bookmarkLoading = false,
  onToggleBookmark,
}: SignalCardProps) {
  const rising = isRising(createdAt);
  const palette = getNicheColor(niche);
  const visibleSourceNames = sourceNames.slice(0, 4);
  const remainingSources = Math.max(0, sourceNames.length - visibleSourceNames.length);
  const timestamp = formatRelativeTime(createdAt);

  return (
    <article className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(0,0,0,0.34)]">
      <span
        className={`absolute inset-y-0 left-0 z-10 w-1 transition-colors duration-300 ${palette.leftAccent} ${palette.leftAccentHover}`}
        aria-hidden="true"
      />

      <Link
        to={`/signal/${id}`}
        className="block"
        aria-label={`Open signal ${label ?? id}`}
      >
        {imageUrl ? (
          <div className="aspect-video w-full overflow-hidden border-b border-border bg-input">
            <img src={imageUrl} alt={label ?? 'Signal preview'} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className={`aspect-video w-full border-b border-border ${palette.gradient}`} />
        )}

        <div className="p-5 pl-6 sm:p-6 sm:pl-7">
          <header className="mb-4 flex items-start justify-between gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${palette.chip}`}
            >
              {niche}
            </span>

            {velocity > 3 && (
              <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                🔥 Velocity {velocity}
              </span>
            )}
          </header>

          <h3 className="text-[20px] font-bold leading-snug tracking-tight text-text">
            {label ?? 'Untitled signal'}
          </h3>

          <p className="mt-3 line-clamp-4 text-sm font-normal leading-relaxed text-muted sm:text-[0.95rem]">
            {summary ?? 'No summary available yet.'}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {visibleSourceNames.map((name) => (
                <span
                  key={name}
                  title={name}
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border bg-input px-1.5 text-[10px] font-semibold uppercase tracking-wide text-text"
                >
                  {getInitials(name)}
                </span>
              ))}
              {remainingSources > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border bg-input px-1.5 text-[10px] font-light text-muted">
                  +{remainingSources}
                </span>
              )}
            </div>

            <span className="text-xs font-light text-muted">{timestamp}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-border px-5 py-3 pl-6 sm:px-6 sm:pl-7">
        <div className="flex items-center gap-2">
          <span className="text-sm font-light text-muted">📡 {sourceCount} sources</span>
          {rising && (
            <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              rising
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleBookmark?.(id);
          }}
          disabled={bookmarkLoading}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-lg leading-none text-text transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>
    </article>
  );
}
