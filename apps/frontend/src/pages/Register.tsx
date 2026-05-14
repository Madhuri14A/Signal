import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth, type AuthUser } from '../context/AuthContext';

type RegisterResponse = {
  token: string;
  user: AuthUser;
};

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [niche, setNiche] = useState('startup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await client.post<RegisterResponse>('/api/auth/register', {
        name,
        email,
        password,
        niche,
      });

      login({ token: data.token, user: data.user });
      navigate('/');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-container">
      <h1 className="app-title">Register</h1>
      <form onSubmit={handleSubmit} className="signal-card">
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>
        <label>
          Niche
          <select value={niche} onChange={(event) => setNiche(event.target.value)}>
            <option value="startup">startup</option>
            <option value="ai">ai</option>
            <option value="fullstack">fullstack</option>
            <option value="artist">artist</option>
            <option value="philosophy">philosophy</option>
            <option value="editorial">editorial</option>
          </select>
        </label>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
