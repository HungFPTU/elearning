import { Injectable } from '@nestjs/common';
import {
  type AdminCategoryDto,
  type CategoryField,
  type CategoryInput,
  type SubjectInput,
  categoryFieldSchema,
} from '@elearning/shared';
import { AuditService } from '../audit/audit.service.js';
import { conflict, notFound } from '../common/app-exception.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const categoryNotFound = () => notFound('CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục');
const subjectNotFound = () => notFound('SUBJECT_NOT_FOUND', 'Không tìm thấy môn học');

/** courseFields is JSON in the DB: keep only entries that still match the schema. */
export function parseCourseFields(value: unknown): CategoryField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = categoryFieldSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminCategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        position: true,
        courseFields: true,
        _count: { select: { courses: true } },
        subjects: {
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            position: true,
            isActive: true,
            _count: { select: { courses: true, instructors: true } },
          },
        },
      },
    });
    return rows.map(({ _count, subjects, courseFields, ...c }) => ({
      ...c,
      courseFields: parseCourseFields(courseFields),
      courseCount: _count.courses,
      subjects: subjects.map(({ _count: n, ...s }) => ({ ...s, courseCount: n.courses, instructorCount: n.instructors })),
    }));
  }

  async createCategory(actor: AuthUser, input: CategoryInput, ctx: RequestContext): Promise<void> {
    await this.withSlugCheck(() =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.category.create({ data: input, select: { id: true } });
        await this.audit.record(
          { ...this.actorOf(actor), action: 'category.create', targetType: 'category', targetId: created.id, after: input },
          ctx,
          tx,
        );
      }),
    );
  }

  async updateCategory(actor: AuthUser, id: string, input: CategoryInput, ctx: RequestContext): Promise<void> {
    const before = await this.prisma.category.findUnique({
      where: { id },
      select: { name: true, slug: true, description: true, position: true, courseFields: true },
    });
    if (!before) throw categoryNotFound();
    await this.withSlugCheck(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.category.update({ where: { id }, data: input });
        await this.audit.record(
          { ...this.actorOf(actor), action: 'category.update', targetType: 'category', targetId: id, before, after: input },
          ctx,
          tx,
        );
      }),
    );
  }

  async deleteCategory(actor: AuthUser, id: string, ctx: RequestContext): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { name: true, slug: true, _count: { select: { courses: true, subjects: true } } },
    });
    if (!category) throw categoryNotFound();
    if (category._count.courses > 0 || category._count.subjects > 0) {
      throw conflict('CATEGORY_IN_USE', 'Danh mục còn môn học hoặc khóa học, hãy chuyển hoặc xóa chúng trước');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await this.audit.record(
        {
          ...this.actorOf(actor),
          action: 'category.delete',
          targetType: 'category',
          targetId: id,
          before: { name: category.name, slug: category.slug },
        },
        ctx,
        tx,
      );
    });
  }

  async createSubject(actor: AuthUser, categoryId: string, input: SubjectInput, ctx: RequestContext): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) throw categoryNotFound();
    await this.withSlugCheck(() =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.subject.create({ data: { ...input, categoryId }, select: { id: true } });
        await this.audit.record(
          {
            ...this.actorOf(actor),
            action: 'subject.create',
            targetType: 'subject',
            targetId: created.id,
            after: { ...input, categoryId },
          },
          ctx,
          tx,
        );
      }),
    );
  }

  async updateSubject(actor: AuthUser, id: string, input: SubjectInput, ctx: RequestContext): Promise<void> {
    const before = await this.prisma.subject.findUnique({
      where: { id },
      select: { name: true, slug: true, description: true, position: true, isActive: true },
    });
    if (!before) throw subjectNotFound();
    await this.withSlugCheck(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.subject.update({ where: { id }, data: input });
        await this.audit.record(
          { ...this.actorOf(actor), action: 'subject.update', targetType: 'subject', targetId: id, before, after: input },
          ctx,
          tx,
        );
      }),
    );
  }

  /** Only empty subjects can be deleted; otherwise deactivate them (isActive = false). */
  async deleteSubject(actor: AuthUser, id: string, ctx: RequestContext): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      select: { name: true, slug: true, _count: { select: { courses: true, instructors: true, applications: true } } },
    });
    if (!subject) throw subjectNotFound();
    if (subject._count.courses + subject._count.instructors + subject._count.applications > 0) {
      throw conflict('SUBJECT_IN_USE', 'Môn học đã có khóa học, giảng viên hoặc đơn đăng ký; hãy tắt môn thay vì xóa');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.subject.delete({ where: { id } });
      await this.audit.record(
        {
          ...this.actorOf(actor),
          action: 'subject.delete',
          targetType: 'subject',
          targetId: id,
          before: { name: subject.name, slug: subject.slug },
        },
        ctx,
        tx,
      );
    });
  }

  private actorOf(actor: AuthUser) {
    return { actorId: actor.id, actorRole: actor.role };
  }

  private async withSlugCheck(run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (e) {
      if (isUniqueViolation(e)) throw conflict('SLUG_TAKEN', 'Slug này đã được dùng');
      throw e;
    }
  }
}
