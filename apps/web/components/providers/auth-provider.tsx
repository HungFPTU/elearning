'use client';

import type { AuthResponse, AuthTokens, LoginInput, MeDto, PermissionKey, RegisterInput } from '@elearning/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { ApiError, apiFetch } from '@/lib/api';

// MVP: tokens live in localStorage. Milestone 3 moves them to httpOnly cookies via a Next route handler.
const STORAGE_KEY = 'elearning.auth';
const ME_KEY = ['me'] as const;

interface AuthContextValue {
  user: MeDto | null;
  isLoading: boolean;
  /** True when the signed-in user has the permission (UI hint only; the API enforces it). */
  can: (permission: PermissionKey) => boolean;
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

// One refresh at a time: the API rotates refresh tokens, so parallel refreshes with the same token would
// all fail but the first, and the losers used to sign the user out.
let refreshInFlight: { refreshToken: string; promise: Promise<AuthTokens | null> } | null = null;

/** Refreshes once per refresh token and stores the result. Resolves null when the session is really over. */
function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  if (refreshInFlight?.refreshToken === refreshToken) return refreshInFlight.promise;
  const promise = apiFetch<AuthTokens>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) })
    .then((fresh) => {
      writeTokens(fresh);
      return fresh;
    })
    .catch(() => {
      // Another tab may have rotated the token first; use its result instead of signing out.
      const latest = readTokens();
      return latest && latest.refreshToken !== refreshToken ? latest : null;
    })
    .finally(() => {
      if (refreshInFlight?.promise === promise) refreshInFlight = null;
    });
  refreshInFlight = { refreshToken, promise };
  return promise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const setUser = useCallback((u: MeDto | null) => queryClient.setQueryData(ME_KEY, u), [queryClient]);

  const authFetch = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const tokens = readTokens();
    if (!tokens) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập');
    try {
      return await apiFetch<T>(path, { ...init, token: tokens.accessToken });
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 401) throw err;
      const latest = readTokens();
      if (latest && latest.accessToken !== tokens.accessToken) {
        // Refreshed by a parallel request (or another tab) after this one started.
        return apiFetch<T>(path, { ...init, token: latest.accessToken });
      }
      const refreshed = await refreshTokens(tokens.refreshToken);
      if (!refreshed) {
        writeTokens(null);
        setUser(null);
        throw err;
      }
      return apiFetch<T>(path, { ...init, token: refreshed.accessToken });
    }
  }, [setUser]);

  // Runs only in the browser (no server prefetch), so localStorage is safe here.
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: () => (readTokens() ? authFetch<MeDto>('/me').catch(() => null) : null),
    staleTime: Infinity,
  });
  const user = me.data ?? null;
  const isLoading = me.isPending;

  // The auth response has no permissions, so load the full profile from /me.
  const handleAuth = useCallback(
    async (res: AuthResponse) => {
      writeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      await queryClient.refetchQueries({ queryKey: ME_KEY });
    },
    [queryClient],
  );
  const can = useCallback((permission: PermissionKey) => user?.permissions.includes(permission) ?? false, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      can,
      authFetch,
      login: async (input) =>
        handleAuth(await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) })),
      register: async (input) =>
        handleAuth(await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) })),
      logout: async () => {
        const tokens = readTokens();
        writeTokens(null);
        setUser(null);
        queryClient.removeQueries({ queryKey: ['admin'] });
        if (tokens) {
          await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) }).catch(
            () => undefined,
          );
        }
      },
    }),
    [user, isLoading, can, authFetch, handleAuth, setUser, queryClient],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
