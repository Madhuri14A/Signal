import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSignalDetail } from '../hooks/useSignals';

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
  const signalId = Number(params.id);

  const signalQuery = useSignalDetail(signalId);

  const content = useMemo(() => {
    if (signalQuery.isLoading) {
      return <p>Loading signal detail...</p>;
    }

    if (signalQuery.isError) {
      return <p>Failed to load signal detail.</p>;
    }

    if (!signalQuery.data) {
      return <p>Signal not found.</p>;
    }

    const signal = signalQuery.data;

    return (
      <>
        <header className="signal-card">
          <h1 className="app-title">{signal.label ?? 'Untitled signal'}</h1>
          <p className="signal-card-summary">{signal.summary ?? 'No summary available yet.'}</p>
        </header>

        <section className="signal-card">
          <h2 className="signal-card-title">Articles</h2>
          <ul className="signal-articles-list">
            {signal.articles.map((article) => (
              <li key={article.id}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="signal-article-link"
                >
                  {article.title}
                </a>
                <div>
                  <small>
                    {article.source_name ?? 'Unknown source'} • {formatPublishedDate(article.published_at)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  }, [signalQuery.data, signalQuery.isError, signalQuery.isLoading]);

  return (
    <main className="app-container">
      <button type="button" className="pill" onClick={() => navigate('/')}>
        Back to home
      </button>
      {content}
      <p>
        <Link to="/">Go to feed</Link>
      </p>
    </main>
  );
}
