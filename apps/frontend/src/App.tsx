import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import EmptyState from './components/EmptyState';
import ErrorMessage from './components/ErrorMessage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SkeletonCard from './components/SkeletonCard';
import SignalCard from './components/SignalCard';
import client from './api/client';
import { useAuth } from './context/AuthContext';
import { useBookmarks } from './hooks/useBookmarks';
import { useSignals, type SignalDetail as SignalDetailData } from './hooks/useSignals';
import { useSources } from './hooks/useSources';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import SignalDetail from './pages/SignalDetail';

const NICHE_ORDER = ['all', 'ai', 'webdev', 'devtools', 'startup', 'security', 'data', 'systems', 'mobile', 'opensource', 'career'] as const;

function signalMatchesNiche(
  signal: SignalDetailData,
  niche: string,
  sourceToNiche: Map<string, string>
) {
  if (niche === 'all') {
    return true;
  }

  return signal.articles.some((article) => {
    const articleNiche = article.source_name ? sourceToNiche.get(article.source_name) : undefined;
    return articleNiche === niche;
  });
}

function resolveSignalNiche(signal: SignalDetailData, sourceToNiche: Map<string, string>) {
  for (const article of signal.articles) {
    if (!article.source_name) {
      continue;
    }

    const articleNiche = sourceToNiche.get(article.source_name);
    if (articleNiche) {
      return articleNiche;
    }
  }

  return 'all';
}

function SignalFeedPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [selectedNiche, setSelectedNiche] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const signalsQuery = useSignals();
  const sourcesQuery = useSources();
  const bookmarksQuery = useBookmarks(token);

  const activeSignalList = signalsQuery.data?.active ?? [];
  const archivedSignalList = signalsQuery.data?.archived ?? [];
  const signalIds = [...activeSignalList, ...archivedSignalList].map((s) => s.id);

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

  const niches = useMemo(() => {
    const available = new Set(Object.keys(sourcesQuery.data ?? {}));
    const ordered = NICHE_ORDER.filter((niche) => niche === 'all' || available.has(niche));
    const orderedSet = new Set<string>(ordered);
    const extras = [...available].filter((niche) => !orderedSet.has(niche)).sort();

    return [...ordered, ...extras];
  }, [sourcesQuery.data]);

  const details = useMemo(
    () => detailQueries.map((q) => q.data).filter((d): d is SignalDetailData => Boolean(d)),
    [detailQueries]
  );

  const detailById = useMemo(() => {
    return new Map(details.map((detail) => [detail.id, detail]));
  }, [details]);

  const activeDetails = useMemo(
    () =>
      activeSignalList
        .map((signal) => detailById.get(signal.id))
        .filter((detail): detail is SignalDetailData => Boolean(detail)),
    [activeSignalList, detailById]
  );

  const archivedDetails = useMemo(
    () =>
      archivedSignalList
        .map((signal) => detailById.get(signal.id))
        .filter((detail): detail is SignalDetailData => Boolean(detail)),
    [archivedSignalList, detailById]
  );

  const filterDetailedSignals = (items: SignalDetailData[]) => {
    const nicheFiltered = items.filter((signal) =>
      signalMatchesNiche(signal, selectedNiche, sourceToNiche)
    );

    const q = searchText.trim().toLowerCase();
    if (!q) {
      return nicheFiltered;
    }

    return nicheFiltered.filter((signal) => {
      const label = signal.label?.toLowerCase() ?? '';
      const summary = signal.summary?.toLowerCase() ?? '';
      return label.includes(q) || summary.includes(q);
    });
  };

  const filteredActiveSignals = useMemo(
    () => filterDetailedSignals(activeDetails),
    [activeDetails, selectedNiche, sourceToNiche, searchText]
  );

  const filteredArchivedSignals = useMemo(
    () => filterDetailedSignals(archivedDetails),
    [archivedDetails, selectedNiche, sourceToNiche, searchText]
  );

  const filteredSavedSignals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const items = bookmarksQuery.data ?? [];

    if (!q) {
      return items;
    }

    return items.filter((signal) => {
      const label = signal.label?.toLowerCase() ?? '';
      const summary = signal.summary?.toLowerCase() ?? '';
      return label.includes(q) || summary.includes(q);
    });
  }, [bookmarksQuery.data, searchText]);

  const displaySavedSignals = filteredSavedSignals;

  const bookmarkedSignalIds = useMemo(() => {
    return new Set((bookmarksQuery.data ?? []).map((signal) => signal.id));
  }, [bookmarksQuery.data]);

  const toggleBookmarkMutation = useMutation({
    mutationFn: async (signalId: number) => {
      if (!token) {
        throw new Error('Missing auth token');
      }

      await client.post(
        `/api/bookmarks/${signalId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return signalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const handleToggleBookmark = (signalId: number) => {
    if (!token || toggleBookmarkMutation.isPending) {
      return;
    }

    toggleBookmarkMutation.mutate(signalId);
  };

  const showingSaved = activeTab === 'saved';

  const isAllLoading =
    signalsQuery.isLoading ||
    sourcesQuery.isLoading ||
    detailQueries.some((queryResult) => queryResult.isLoading);

  const isAllError =
    signalsQuery.isError ||
    sourcesQuery.isError ||
    detailQueries.some((queryResult) => queryResult.isError);

  const isLoading = showingSaved ? bookmarksQuery.isLoading : isAllLoading;
  const isError = showingSaved ? bookmarksQuery.isError : isAllError;

  const activeListCount = showingSaved ? displaySavedSignals.length : filteredActiveSignals.length;

  const renderSignalGrid = (items: SignalDetailData[], isArchived = false) => (
    <motion.section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {items.map((signal) => {
        const sourceCount = new Set(
          signal.articles
            .map((article) => article.source_name)
            .filter((name): name is string => Boolean(name))
        ).size;
        const sourceNames = [
          ...new Set(
            signal.articles
              .map((article) => article.source_name?.trim())
              .filter((name): name is string => Boolean(name))
          ),
        ];
        const imageUrl = signal.articles.find((article) => article.image_url)?.image_url;

        return (
          <motion.div
            key={signal.id}
            variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <SignalCard
              id={signal.id}
              label={signal.label}
              summary={signal.summary}
              velocity={signal.velocity}
              createdAt={signal.created_at}
              niche={resolveSignalNiche(signal, sourceToNiche)}
              sourceCount={sourceCount}
              sourceNames={sourceNames}
              imageUrl={imageUrl}
              isBookmarked={bookmarkedSignalIds.has(signal.id)}
              bookmarkLoading={toggleBookmarkMutation.isPending}
              onToggleBookmark={handleToggleBookmark}
              isArchived={isArchived}
            />
          </motion.div>
        );
      })}
    </motion.section>
  );

  return (
    <Layout niches={niches} selectedNiche={selectedNiche} onChangeNiche={setSelectedNiche}>
      <div className="mb-6 flex items-center gap-6">
        {(['all', 'saved'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`relative rounded-full border px-4 py-1.5 text-sm font-semibold capitalize transition-all focus:outline-none focus:ring-2 focus:ring-accent/35 ${
              activeTab === tab
                ? 'border-accent bg-accent text-background'
                : 'border-border bg-card text-muted hover:border-accent/30 hover:text-text'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.span
                layoutId="feed-tab-underline"
                className="absolute -bottom-1 left-3 right-3 h-px bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search signals..."
          className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
          aria-label="Search signals"
        />
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Signals this week</p>
        <p className="mt-1 text-3xl font-semibold text-text">
          {activeListCount}
          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
        </p>
      </div>

      {isLoading && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>
      )}

      {isError && <ErrorMessage />}

      {!isLoading && !isError && activeListCount === 0 && (
        // If there are archived signals for this niche, surface them with an "older signal" badge.
        filteredArchivedSignals.length > 0 ? (
          <>
            <section>
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />
                Older signals
              </h2>
              {renderSignalGrid(filteredArchivedSignals, true)}
            </section>
          </>
        ) : (
          <EmptyState message="Try switching to All, or check back soon." />
        )
      )}

      {!isLoading && !isError && activeListCount > 0 &&
        (showingSaved ? (
          <motion.section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {displaySavedSignals.map((signal) => {
              const detail = detailById.get(signal.id);
              const sourceNames = detail
                ? [
                    ...new Set(
                      detail.articles
                        .map((article) => article.source_name?.trim())
                        .filter((name): name is string => Boolean(name))
                    ),
                  ]
                : [];
              const imageUrl = detail?.articles.find((article) => article.image_url)?.image_url;

              return (
                <motion.div
                  key={signal.id}
                  variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <SignalCard
                    id={signal.id}
                    label={signal.label}
                    summary={signal.summary}
                    velocity={signal.velocity}
                    createdAt={signal.created_at}
                    niche={detail ? resolveSignalNiche(detail, sourceToNiche) : 'all'}
                    sourceCount={signal.article_count}
                    sourceNames={sourceNames}
                    imageUrl={imageUrl}
                    isBookmarked={bookmarkedSignalIds.has(signal.id)}
                    bookmarkLoading={toggleBookmarkMutation.isPending}
                    onToggleBookmark={handleToggleBookmark}
                  />
                </motion.div>
              );
            })}
          </motion.section>
        ) : (
          <>
            {renderSignalGrid(filteredActiveSignals)}

            {filteredArchivedSignals.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Previously trending
                </h2>
                {renderSignalGrid(filteredArchivedSignals)}
              </section>
            )}
          </>
        ))}
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<SignalFeedPage />}
      />
      <Route path="/signal/:id" element={<SignalDetail />} />
      <Route path="/s/:id" element={<SignalDetail />} />
      <Route path="/signals/:id" element={<SignalDetail />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
