export const Role = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const CourseLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  ALL_LEVELS: 'ALL_LEVELS',
} as const;
export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
  ALL_LEVELS: 'Mọi cấp độ',
};
