import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth, type AuthUser } from '../context/AuthContext';

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await client.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      login({ token: data.token, user: data.user });
      navigate('/');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-text sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Signal
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
            </h1>
            <p className="mt-2 text-sm text-muted">
              Know what matters. Before everyone else.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-text">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-border bg-input px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>

            <label className="block text-sm font-medium text-text">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-border bg-input px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-background transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <p className="text-center text-sm text-muted">
              New here?{' '}
              <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
                Create an account
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
