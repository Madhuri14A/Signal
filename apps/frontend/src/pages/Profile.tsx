import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const NICHES = ['ai', 'webdev', 'devtools', 'startup', 'security', 'data'] as const;

function IconArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useAuth();
  const [savingNiche, setSavingNiche] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const handleNicheChange = async (niche: string) => {
    if (savingNiche || niche === user.niche) return;
    setError(null);
    setSavingNiche(niche);
    try {
      await client.put('/api/user/niche', { niche }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUser({ ...user, niche });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update. Please try again.');
    } finally {
      setSavingNiche(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:text-text"
            aria-label="Back to feed"
          >
            <IconArrowLeft />
          </Link>
          <h1 className="text-lg font-semibold text-text">Profile</h1>
        </div>

        <section className="mb-4 rounded-xl border border-border bg-card p-6">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted mb-1">Name</p>
            <p className="text-[15px] font-medium text-text">{user.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted mb-1">Email</p>
            <p className="text-[15px] font-medium text-text">{user.email}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted">Interest</p>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((niche) => {
              const selected = user.niche === niche;
              return (
                <button
                  key={niche}
                  type="button"
                  onClick={() => handleNicheChange(niche)}
                  disabled={Boolean(savingNiche)}
                  className={`rounded-md border px-3.5 py-1.5 text-[13px] font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-border bg-input text-muted hover:text-text'
                  }`}
                >
                  {niche}
                </button>
              );
            })}
          </div>

          {savingNiche && <p className="mt-3 text-xs text-muted">Saving...</p>}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </section>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted transition hover:border-red-500/40 hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
