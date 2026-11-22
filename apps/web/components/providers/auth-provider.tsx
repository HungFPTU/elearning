'use client';

import type { AuthResponse, AuthTokens, LoginInput, RegisterInput, UserDto } from '@elearning/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { ApiError, apiFetch } from '@/lib/api';

// MVP: tokens live in localStorage. Milestone 3 moves them to httpOnly cookies via a Next route handler.
const STORAGE_KEY = 'elearning.auth';
const ME_KEY = ['me'] as const;

interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Authenticated fetch that refreshes the access token once on 401. */
  authFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: AuthTokens | null) {
  if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const setUser = useCallback((u: UserDto | null) => queryClient.setQueryData(ME_KEY, u), [queryClient]);

  const authFetch = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const tokens = readTokens();
    if (!tokens) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập');
    try {
      return await apiFetch<T>(path, { ...init, token: tokens.accessToken });
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 401) throw err;
      const refreshed = await apiFetch<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      }).catch(() => null);
      if (!refreshed) {
        writeTokens(null);
        setUser(null);
        throw err;
      }
      writeTokens(refreshed);
      return apiFetch<T>(path, { ...init, token: refreshed.accessToken });
    }
  }, [setUser]);

  // Runs only in the browser (no server prefetch), so localStorage is safe here.
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: () => (readTokens() ? authFetch<UserDto>('/me').catch(() => null) : null),
    staleTime: Infinity,
  });
  const user = me.data ?? null;
  const isLoading = me.isPending;

  const handleAuth = useCallback((res: AuthResponse) => {
    writeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      authFetch,
      login: async (input) =>
        handleAuth(await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) })),
      register: async (input) =>
        handleAuth(await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) })),
      logout: async () => {
        const tokens = readTokens();
        writeTokens(null);
        setUser(null);
        if (tokens) {
          await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) }).catch(
            () => undefined,
          );
        }
      },
    }),
    [user, isLoading, authFetch, handleAuth, setUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
