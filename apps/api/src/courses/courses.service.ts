import { Injectable } from '@nestjs/common';
import type { CourseDetailDto, CourseListQuery, CourseSummaryDto, Paginated } from '@elearning/shared';
import { notFound } from '../common/app-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const summarySelect = {
  id: true,
  title: true,
  slug: true,
  subtitle: true,
  thumbnailUrl: true,
  price: true,
  salePrice: true,
  level: true,
  instructor: { select: { id: true, fullName: true } },
  category: { select: { id: true, name: true, slug: true } },
  sections: { select: { _count: { select: { lessons: true } } } },
} satisfies Prisma.CourseSelect;

type CourseSummaryRow = Prisma.CourseGetPayload<{ select: typeof summarySelect }>;
type RatingStats = { ratingAvg: number | null; ratingCount: number };

const ORDER_BY: Record<CourseListQuery['sort'], Prisma.CourseOrderByWithRelationInput> = {
  newest: { publishedAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
};

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(query: CourseListQuery): Promise<Paginated<CourseSummaryDto>> {
    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      ...(query.q && { title: { contains: query.q, mode: 'insensitive' } }),
      ...(query.category && { category: { slug: query.category } }),
      ...(query.level && { level: query.level }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        select: summarySelect,
        orderBy: ORDER_BY[query.sort],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);
    const ratings = await this.ratingStats(rows.map((r) => r.id));
    return {
      items: rows.map((row) => toSummary(row, ratings.get(row.id))),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getPublishedBySlug(slug: string): Promise<CourseDetailDto> {
    const course = await this.prisma.course.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        ...summarySelect,
        description: true,
        previewVideoUrl: true,
        language: true,
        publishedAt: true,
        sections: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            _count: { select: { lessons: true } },
            // Outline only: never expose videoAssetId here; playback goes through an enrollment check.
            lessons: {
              orderBy: { position: 'asc' },
              select: { id: true, title: true, durationSeconds: true, isPreview: true },
            },
          },
        },
      },
    });
    if (!course) throw notFound('COURSE_NOT_FOUND', 'Không tìm thấy khóa học');

    const ratings = await this.ratingStats([course.id]);
    const sections = course.sections.map(({ id, title, lessons }) => ({ id, title, lessons }));
    return {
      ...toSummary(course, ratings.get(course.id)),
      description: course.description,
      previewVideoUrl: course.previewVideoUrl,
      language: course.language,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      sections,
      totalDurationSeconds: sections.flatMap((s) => s.lessons).reduce((sum, l) => sum + l.durationSeconds, 0),
    };
  }

  private async ratingStats(courseIds: string[]): Promise<Map<string, RatingStats>> {
    if (courseIds.length === 0) return new Map();
    const groups = await this.prisma.review.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [g.courseId, { ratingAvg: g._avg.rating, ratingCount: g._count._all }]));
  }
}

function toSummary(row: CourseSummaryRow, rating?: RatingStats): CourseSummaryDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle,
    thumbnailUrl: row.thumbnailUrl,
    price: row.price,
    salePrice: row.salePrice,
    level: row.level,
    instructor: row.instructor,
    category: row.category,
    lessonCount: row.sections.reduce((sum, s) => sum + s._count.lessons, 0),
    ratingAvg: rating?.ratingAvg ?? null,
    ratingCount: rating?.ratingCount ?? 0,
  };
}
