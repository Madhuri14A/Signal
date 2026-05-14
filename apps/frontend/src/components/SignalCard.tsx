import { Link } from 'react-router-dom';

type SignalCardProps = {
  id: number;
  label: string | null;
  summary: string | null;
  velocity: number;
  createdAt: string;
  niche: string;
  sourceCount: number;
};

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
}: SignalCardProps) {
  const rising = isRising(createdAt);

  return (
    <Link to={`/signal/${id}`} className="signal-card-link" aria-label={`Open signal ${label ?? id}`}>
      <article className="signal-card">
        <header className="signal-card-header">
          <h3 className="signal-card-title">{label ?? 'Untitled signal'}</h3>
          <div className="signal-meta-tags">
            {velocity > 3 && <span className="signal-badge">🔥 {sourceCount} sources</span>}
            {rising && <span className="signal-rising">📈 Rising</span>}
            <span className="signal-niche-pill">{niche}</span>
          </div>
        </header>

        <p className="signal-card-summary">{summary ?? 'No summary available yet.'}</p>
      </article>
    </Link>
  );
}
