'use client';

import type { CategoryTreeDto } from '@elearning/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/** Public category -> subject tree, shared by every subject picker. */
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiFetch<CategoryTreeDto[]>('/categories'),
    staleTime: 5 * 60_000,
  });
}
