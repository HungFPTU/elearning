import type { ApiError as ApiErrorBody, CategoryDto, CourseDetailDto, CourseSummaryDto, Paginated } from '@elearning/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Thrown for every non-2xx API response; mirrors the API's unified error body. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    throw new ApiError(res.status, body?.code ?? 'ERROR', body?.message ?? 'Đã có lỗi xảy ra');
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Server-side reads used by Server Components. */
export const api = {
  listCourses: (params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
    return apiFetch<Paginated<CourseSummaryDto>>(`/courses?${qs.toString()}`);
  },
  getCourse: (slug: string) => apiFetch<CourseDetailDto>(`/courses/${encodeURIComponent(slug)}`),
  listCategories: () => apiFetch<CategoryDto[]>('/categories'),
};
