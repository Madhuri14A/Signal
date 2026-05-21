import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSignalDetail } from '../hooks/useSignals';
import { useSources } from '../hooks/useSources';

type CounterpointSource = 'ai' | 'fallback';

type SavedArticle = {
  id: number;
  signalId: number;
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string | null;
  savedAt: string;
};

const READ_LATER_KEY = 'signal.read_later.articles';

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
  const [counterpointSource, setCounterpointSource] = useState<CounterpointSource | null>(null);
  const [loadingBlindspot, setLoadingBlindspot] = useState(false);
  const [blindspotError, setBlindspotError] = useState<string | null>(null);
  const [savedArticleIds, setSavedArticleIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(READ_LATER_KEY);
      if (!raw) return new Set<number>();
      const parsed = JSON.parse(raw) as SavedArticle[];
      return new Set(parsed.map((a) => a.id));
    } catch {
      return new Set<number>();
    }
  });

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
      const { data } = await client.post<{ counterargument: string; source?: CounterpointSource }>(
        '/api/blindspot',
        { signalId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCounterargument(data.counterargument);
      setCounterpointSource(data.source ?? 'ai');
    } catch (error) {
      setBlindspotError(
        error instanceof Error ? error.message : 'Failed to generate counterpoint.'
      );
    } finally {
      setLoadingBlindspot(false);
    }
  };

  const toggleReadLater = (article: {
    id: number;
    title: string;
    url: string;
    source_name: string | null;
    published_at: string | null;
  }) => {
    if (!Number.isFinite(signalId) || signalId <= 0) return;

    try {
      const raw = localStorage.getItem(READ_LATER_KEY);
      const existing = raw ? (JSON.parse(raw) as SavedArticle[]) : [];
      const has = existing.some((item) => item.id === article.id);

      const next = has
        ? existing.filter((item) => item.id !== article.id)
        : [
            {
              id: article.id,
              signalId,
              title: article.title,
              url: article.url,
              sourceName: article.source_name,
              publishedAt: article.published_at,
              savedAt: new Date().toISOString(),
            },
            ...existing,
          ];

      localStorage.setItem(READ_LATER_KEY, JSON.stringify(next));
      setSavedArticleIds(new Set(next.map((item) => item.id)));
    } catch {
      // noop
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

    const timeline = (() => {
      const dated = signal.articles
        .map((article) => article.published_at)
        .filter((v): v is string => Boolean(v))
        .map((v) => new Date(v))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const first = dated[0] ?? null;
      const last = dated[dated.length - 1] ?? null;

      const byDay = new Map<string, number>();
      for (const d of dated) {
        const k = d.toISOString().slice(0, 10);
        byDay.set(k, (byDay.get(k) ?? 0) + 1);
      }
      const peak = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

      const uniqueSources = new Set(
        signal.articles
          .map((a) => a.source_name?.trim())
          .filter((name): name is string => Boolean(name))
      ).size;

      return {
        first,
        last,
        peak,
        created: signal.created_at ? new Date(signal.created_at) : null,
        uniqueSources,
      };
    })();

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
            {loadingBlindspot ? 'Generating counterpoint...' : 'Counterpoint'}
          </button>

          {blindspotError && <p className="mt-3 text-sm text-red-400">{blindspotError}</p>}

          {counterargument && (
            <div className="mt-5 rounded-xl border border-accent/35 bg-accent/10 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-accent">Counterpoint</p>
              <p className="text-sm text-accent-text">{counterargument}</p>
              {counterpointSource === 'fallback' && (
                <p className="mt-2 text-xs text-accent/85">AI unavailable right now. Showing a safe fallback perspective.</p>
              )}
            </div>
          )}
        </header>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Signal Timeline</h2>
          <ol className="space-y-3">
            {timeline.first && (
              <li className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted">
                <span className="font-medium text-text">{formatPublishedDate(timeline.first.toISOString())}</span> — First related article appears.
              </li>
            )}
            {timeline.created && (
              <li className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted">
                <span className="font-medium text-text">{formatPublishedDate(timeline.created.toISOString())}</span> — Signal detected ({timeline.uniqueSources} sources).
              </li>
            )}
            {timeline.peak && (
              <li className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted">
                <span className="font-medium text-text">{formatPublishedDate(`${timeline.peak[0]}T00:00:00Z`)}</span> — Peak coverage ({timeline.peak[1]} articles in a day).
              </li>
            )}
            {timeline.last && (
              <li className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted">
                <span className="font-medium text-text">{formatPublishedDate(timeline.last.toISOString())}</span> — Latest mention in this cluster.
              </li>
            )}
          </ol>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Related Articles</h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {signal.articles.map((article) => (
              <li key={article.id} className="overflow-hidden rounded-xl border border-border bg-background">
                {article.image_url && (
                  <img src={article.image_url} alt={article.title} className="h-32 w-full object-cover" />
                )}
                <div className="p-3.5">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      try {
                        const key = 'signal.read_history.article_ids';
                        const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as number[];
                        const next = [article.id, ...existing.filter((id) => id !== article.id)].slice(0, 300);
                        localStorage.setItem(key, JSON.stringify(next));
                      } catch {
                        // noop
                      }
                    }}
                    className="group line-clamp-2 inline-flex items-start gap-2 text-sm font-medium leading-snug text-text hover:text-accent"
                  >
                    <span>{article.title}</span>
                    <span className="mt-0.5 text-[10px] opacity-80 transition group-hover:opacity-100">↗</span>
                  </a>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <small className="text-xs text-muted">
                      {article.source_name ?? 'Unknown source'} • {formatPublishedDate(article.published_at)}
                    </small>
                    <button
                      type="button"
                      onClick={() => toggleReadLater(article)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                        savedArticleIds.has(article.id)
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-border text-muted hover:text-text'
                      }`}
                    >
                      {savedArticleIds.has(article.id) ? 'Saved' : 'Read later'}
                    </button>
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
    counterpointSource,
    handleGenerateBlindspot,
    loadingBlindspot,
    savedArticleIds,
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
