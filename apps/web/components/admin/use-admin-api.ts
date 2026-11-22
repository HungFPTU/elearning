'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';

/** Every admin query key starts with 'admin' so logout can drop them all. */
export function useAdminQuery<T>(key: readonly unknown[], path: string, options: { enabled?: boolean } = {}) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: ['admin', ...key],
    queryFn: () => authFetch<T>(path),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    // Same filters within 30 s reuse the cached page instead of hitting the API again.
    staleTime: 30_000,
  });
}

export const jsonBody = (method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export function toQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '');
  return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
