import type { CourseLevel, Role } from './enums.js';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Error body returned by the API for every failed request. */
export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserDto;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface CourseSummaryDto {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  /** VND */
  price: number;
  /** VND */
  salePrice: number | null;
  level: CourseLevel;
  instructor: { id: string; fullName: string };
  category: CategoryDto | null;
  lessonCount: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface LessonOutlineDto {
  id: string;
  title: string;
  durationSeconds: number;
  isPreview: boolean;
}

export interface SectionOutlineDto {
  id: string;
  title: string;
  lessons: LessonOutlineDto[];
}

export interface CourseDetailDto extends CourseSummaryDto {
  description: string;
  previewVideoUrl: string | null;
  language: string;
  publishedAt: string | null;
  sections: SectionOutlineDto[];
  totalDurationSeconds: number;
}
