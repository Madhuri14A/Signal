import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSignalDetail } from '../hooks/useSignals';
import { useSources } from '../hooks/useSources';

function formatPublishedDate(value: string | null): string {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SignalDetail() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const sourcesQuery = useSources();
  const signalId = Number(params.id);
  const [counterargument, setCounterargument] = useState<string | null>(null);
  const [loadingBlindspot, setLoadingBlindspot] = useState(false);
  const [blindspotError, setBlindspotError] = useState<string | null>(null);

  const signalQuery = useSignalDetail(signalId);

  const sourceToNiche = useMemo(() => {
    const map = new Map<string, string>();
    const grouped = sourcesQuery.data ?? {};

    for (const [niche, sources] of Object.entries(grouped)) {
      for (const source of sources) {
        map.set(source.name, niche);
      }
    }

    return map;
  }, [sourcesQuery.data]);

  const handleGenerateBlindspot = async () => {
    if (!token || !Number.isFinite(signalId) || signalId <= 0 || loadingBlindspot) {
      return;
    }

    setBlindspotError(null);
    setLoadingBlindspot(true);

    try {
      const { data } = await client.post<{ counterargument: string }>(
        '/api/blindspot',
        { signalId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCounterargument(data.counterargument);
    } catch (error) {
      setBlindspotError(
        error instanceof Error ? error.message : 'Failed to generate another perspective.'
      );
    } finally {
      setLoadingBlindspot(false);
    }
  };

  const content = useMemo(() => {
    if (signalQuery.isLoading) {
      return <p className="text-muted">Loading signal detail...</p>;
    }

    if (signalQuery.isError) {
      return <p className="text-red-400">Failed to load signal detail.</p>;
    }

    if (!signalQuery.data) {
      return <p className="text-muted">Signal not found.</p>;
    }

    const signal = signalQuery.data;
    const inferredNiche =
      signal.articles
        .map((article) => (article.source_name ? sourceToNiche.get(article.source_name) : undefined))
        .find((niche): niche is string => Boolean(niche)) ?? 'all';

    return (
      <>
        <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-input px-3 py-1 text-xs font-medium capitalize text-text">
              {inferredNiche}
            </span>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              🔥 Velocity {signal.velocity}
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-tight text-text sm:text-4xl">
            {signal.label ?? 'Untitled signal'}
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">
            {signal.summary ?? 'No summary available yet.'}
          </p>

          <button
            type="button"
            onClick={handleGenerateBlindspot}
            disabled={loadingBlindspot || !token}
            className="mt-6 rounded-xl border border-accent px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingBlindspot ? 'Finding perspective...' : 'Blind Spot'}
          </button>

          {blindspotError && <p className="mt-3 text-sm text-red-400">{blindspotError}</p>}

          {counterargument && (
            <div className="mt-5 rounded-xl border border-accent/35 bg-accent/10 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-accent">🧠 Another perspective</p>
              <p className="text-sm text-accent-text">{counterargument}</p>
            </div>
          )}
        </header>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="mb-4 text-xl font-semibold text-text">Articles</h2>
          <ul className="space-y-4">
            {signal.articles.map((article) => (
              <li key={article.id} className="overflow-hidden rounded-2xl border border-border bg-background">
                {article.image_url && (
                  <img src={article.image_url} alt={article.title} className="aspect-video w-full object-cover" />
                )}
                <div className="p-4">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 text-text hover:text-accent"
                  >
                    <span>{article.title}</span>
                    <span className="text-xs opacity-80 transition group-hover:opacity-100">↗</span>
                  </a>
                  <div className="mt-2">
                    <small className="text-muted">
                      {article.source_name ?? 'Unknown source'} • {formatPublishedDate(article.published_at)}
                    </small>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  }, [
    blindspotError,
    counterargument,
    handleGenerateBlindspot,
    loadingBlindspot,
    sourceToNiche,
    signalQuery.data,
    signalQuery.isError,
    signalQuery.isLoading,
    token,
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-text">
      <div className="mx-auto max-w-5xl">
        <div className="sticky top-3 z-20 mb-5">
          <button
            type="button"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted transition hover:text-text"
            onClick={() => navigate('/')}
          >
            ← Back to feed
          </button>
        </div>

        {content}

        <p className="mt-4">
          <Link to="/" className="text-accent hover:text-accent-hover">
            Go to feed
          </Link>
        </p>
      </div>
    </main>
  );
}
