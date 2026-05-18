import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AuthUser = {
  id: number;
  name: string;
  email: string;
  niche: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (payload: { token: string; user: AuthUser }) => void;
  updateUser: (nextUser: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_STORAGE_KEY = 'signal.auth';

type StoredAuth = {
  token: string;
  user: AuthUser;
};

function readStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (!parsed.token || !parsed.user) {
      return null;
    }

    return {
      token: parsed.token,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

function writeStoredAuth(payload: StoredAuth | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!payload) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [initialAuth] = useState<StoredAuth | null>(() => readStoredAuth());
  const [user, setUser] = useState<AuthUser | null>(initialAuth?.user ?? null);
  const [token, setToken] = useState<string | null>(initialAuth?.token ?? null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: ({ token: nextToken, user: nextUser }) => {
        setToken(nextToken);
        setUser(nextUser);
        writeStoredAuth({ token: nextToken, user: nextUser });
      },
      updateUser: (nextUser: AuthUser) => {
        setUser(nextUser);
        if (token) {
          writeStoredAuth({ token, user: nextUser });
        }
      },
      logout: () => {
        setToken(null);
        setUser(null);
        writeStoredAuth(null);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export type { AuthUser };
