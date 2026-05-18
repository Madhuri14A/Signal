import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const NICHES = ['startup', 'ai', 'fullstack', 'artist', 'philosophy', 'editorial'] as const;

export default function Profile() {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useAuth();
  const [savingNiche, setSavingNiche] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const handleNicheChange = async (niche: string) => {
    if (savingNiche || niche === user.niche) {
      return;
    }

    setError(null);
    setSavingNiche(niche);

    try {
      await client.put(
        '/api/user/niche',
        { niche },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      updateUser({ ...user, niche });
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Failed to update niche. Please try again.'
      );
    } finally {
      setSavingNiche(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-50">Profile</h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Back
          </button>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm text-slate-400">Name</p>
          <p className="mb-4 text-lg font-semibold text-slate-100">{user.name}</p>

          <p className="text-sm text-slate-400">Email</p>
          <p className="mb-6 text-lg font-semibold text-slate-100">{user.email}</p>

          <p className="mb-3 text-sm text-slate-400">Choose your niche</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {NICHES.map((niche) => {
              const selected = user.niche === niche;

              return (
                <button
                  key={niche}
                  type="button"
                  onClick={() => handleNicheChange(niche)}
                  disabled={Boolean(savingNiche)}
                  className={`rounded-full border px-4 py-2 text-sm capitalize transition ${
                    selected
                      ? 'border-blue-400 bg-blue-500 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {niche}
                </button>
              );
            })}
          </div>

          {savingNiche && <p className="mb-4 text-sm text-slate-400">Saving niche...</p>}
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
          >
            Logout
          </button>
        </section>
      </div>
    </main>
  );
}
