import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import NicheSelector from './components/NicheSelector';
import ProtectedRoute from './components/ProtectedRoute';
import SignalCard from './components/SignalCard';
import client from './api/client';
import { useSignals, type SignalDetail as SignalDetailData } from './hooks/useSignals';
import { useSources } from './hooks/useSources';
import Login from './pages/Login';
import Register from './pages/Register';
import SignalDetail from './pages/SignalDetail';

const NICHES = ['startup', 'ai', 'fullstack', 'artist', 'philosophy', 'editorial'] as const;

function SignalFeedPage() {
  const [selectedNiche, setSelectedNiche] = useState<string>('startup');
  const signalsQuery = useSignals();
  const sourcesQuery = useSources();

  const signalIds = (signalsQuery.data ?? []).map((s) => s.id);

  const detailQueries = useQueries({
    queries: signalIds.map((signalId) => ({
      queryKey: ['signal', signalId],
      queryFn: async () => {
        const { data } = await client.get<SignalDetailData>(`/api/signals/${signalId}`);
        return data;
      },
      staleTime: 1000 * 60,
    })),
  });

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

  const details = useMemo(
    () => detailQueries.map((q) => q.data).filter((d): d is SignalDetailData => Boolean(d)),
    [detailQueries]
  );

  const filteredSignals = useMemo(() => {
    return details.filter((signal) =>
      signal.articles.some((article) => {
        const niche = article.source_name ? sourceToNiche.get(article.source_name) : undefined;
        return niche === selectedNiche;
      })
    );
  }, [details, selectedNiche, sourceToNiche]);

  const isLoading =
    signalsQuery.isLoading ||
    sourcesQuery.isLoading ||
    detailQueries.some((queryResult) => queryResult.isLoading);

  const isError =
    signalsQuery.isError ||
    sourcesQuery.isError ||
    detailQueries.some((queryResult) => queryResult.isError);

  return (
    <main className="app-container">
      <h1 className="app-title">Signal</h1>

      <NicheSelector
        niches={[...NICHES]}
        selectedNiche={selectedNiche}
        onChange={setSelectedNiche}
      />

      {isLoading && <p>Loading signals...</p>}
      {isError && <p>Failed to load signals. Please try again.</p>}

      {!isLoading && !isError && filteredSignals.length === 0 && (
        <p>No signals found for “{selectedNiche}”.</p>
      )}

      <section className="signals-grid">
        {filteredSignals.map((signal) => {
          const sourceCount = new Set(
            signal.articles
              .map((article) => article.source_name)
              .filter((name): name is string => Boolean(name))
          ).size;

          return (
            <SignalCard
              key={signal.id}
              id={signal.id}
              label={signal.label}
              summary={signal.summary}
              velocity={signal.velocity}
              createdAt={signal.created_at}
              niche={selectedNiche}
              sourceCount={sourceCount}
            />
          );
        })}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SignalFeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/signal/:id"
        element={
          <ProtectedRoute>
            <SignalDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/signals/:id"
        element={
          <ProtectedRoute>
            <SignalDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
