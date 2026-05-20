import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NA';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('');
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recent';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function isRising(createdAt: string): boolean {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() <= 24 * 60 * 60 * 1000;
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
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
  isBookmarked = false,
  bookmarkLoading = false,
  onToggleBookmark,
}: SignalCardProps) {
  const rising = isRising(createdAt);
  const palette = getNicheColor(niche);
  const visibleSourceNames = sourceNames.slice(0, 3);
  const remainingSources = Math.max(0, sourceNames.length - visibleSourceNames.length);
  const timestamp = formatRelativeTime(createdAt);

  return (
    <article className="group relative flex flex-col w-full overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-border/80 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.28)]">
      <span
        className={`absolute inset-y-0 left-0 z-10 w-[3px] ${palette.leftAccent}`}
        aria-hidden="true"
      />

      <Link
        to={`/signal/${id}`}
        className="flex flex-col flex-1 p-5 pl-6"
        aria-label={`Open signal: ${label ?? id}`}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${palette.chip}`}
          >
            {niche}
          </span>

          <div className="flex items-center gap-1.5">
            {velocity > 3 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/8 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                <IconTrendUp />
                {velocity}
              </span>
            )}
            {rising && (
              <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted">
                new
              </span>
            )}
          </div>
        </header>

        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-text">
          {label ?? 'Untitled signal'}
        </h3>

        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">
          {summary ?? 'No summary available yet.'}
        </p>

        <footer className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {visibleSourceNames.map((name) => (
              <span
                key={name}
                title={name}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-input px-1 text-[10px] font-semibold uppercase tracking-wide text-muted"
              >
                {getInitials(name)}
              </span>
            ))}
            {remainingSources > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-input px-1 text-[10px] text-muted">
                +{remainingSources}
              </span>
            )}
            <span className="text-[11px] text-muted/60 ml-0.5">{sourceCount} sources</span>
          </div>
          <span className="text-[11px] text-muted/60">{timestamp}</span>
        </footer>
      </Link>

      <div className="flex items-center justify-end border-t border-border/60 px-5 py-2 pl-6">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleBookmark?.(id);
          }}
          disabled={bookmarkLoading}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save signal'}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${
            isBookmarked ? 'text-accent' : 'text-muted hover:text-text'
          }`}
        >
          <IconBookmark filled={isBookmarked} />
        </button>
      </div>
    </article>
  );
}
