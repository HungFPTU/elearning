import { Injectable } from '@nestjs/common';
import {
  type AdminInstructorApplicationDto,
  type ApplicationListQuery,
  ApplicationStatus,
  type ApproveApplicationInput,
  type InstructorApplicationDto,
  type Paginated,
  type RejectApplicationInput,
  Role,
  type SubmitApplicationInput,
  type TeachingSubjectDto,
} from '@elearning/shared';
import { PermissionsService } from '../access/permissions.service.js';
import { teachingSubjectSelect } from '../admin/admin-users.service.js';
import { AuditService } from '../audit/audit.service.js';
import { badRequest, conflict, notFound } from '../common/app-exception.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  assertApprovedSubset,
  assertCanDecide,
  assertNoPendingApplication,
  subjectsToRequest,
} from './instructor-rules.js';

const applicationSelect = {
  id: true,
  userId: true,
  status: true,
  headline: true,
  bio: true,
  experience: true,
  links: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
  reviewedBy: { select: { id: true, fullName: true } },
  subjects: {
    orderBy: { subject: { name: 'asc' } },
    select: { approved: true, subject: { select: teachingSubjectSelect } },
  },
} satisfies Prisma.InstructorApplicationSelect;

type ApplicationRow = Prisma.InstructorApplicationGetPayload<{ select: typeof applicationSelect }>;

const toDto = ({ userId: _userId, subjects, reviewedAt, createdAt, ...a }: ApplicationRow): InstructorApplicationDto => ({
  ...a,
  subjects: subjects.map((s) => ({ ...s.subject, approved: s.approved })),
  reviewedAt: reviewedAt?.toISOString() ?? null,
  createdAt: createdAt.toISOString(),
});

const applicationNotFound = () => notFound('APPLICATION_NOT_FOUND', 'Không tìm thấy đơn đăng ký');

@Injectable()
export class InstructorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async teachingSubjects(userId: string): Promise<TeachingSubjectDto[]> {
    const rows = await this.prisma.instructorSubject.findMany({
      where: { userId },
      orderBy: { subject: { name: 'asc' } },
      select: { subject: { select: teachingSubjectSelect } },
    });
    return rows.map((r) => r.subject);
  }

  async myApplications(userId: string): Promise<InstructorApplicationDto[]> {
    const rows = await this.prisma.instructorApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: applicationSelect,
    });
    return rows.map(toDto);
  }

  async submit(user: AuthUser, input: SubmitApplicationInput, ctx: RequestContext): Promise<InstructorApplicationDto> {
    const [pending, teaching, activeSubjects] = await Promise.all([
      this.prisma.instructorApplication.count({ where: { userId: user.id, status: ApplicationStatus.PENDING } }),
      this.prisma.instructorSubject.findMany({ where: { userId: user.id }, select: { subjectId: true } }),
      this.prisma.subject.findMany({ where: { id: { in: input.subjectIds }, isActive: true }, select: { id: true } }),
    ]);
    assertNoPendingApplication(pending);
    if (activeSubjects.length !== input.subjectIds.length) {
      throw badRequest('SUBJECT_NOT_FOUND', 'Có môn học không tồn tại hoặc đã ngừng mở');
    }
    const subjectIds = subjectsToRequest(
      input.subjectIds,
      teaching.map((t) => t.subjectId),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const application = await tx.instructorApplication.create({
        data: {
          userId: user.id,
          headline: input.headline,
          bio: input.bio,
          experience: input.experience,
          links: input.links,
          subjects: { create: subjectIds.map((subjectId) => ({ subjectId })) },
        },
        select: applicationSelect,
      });
      await this.audit.record(
        {
          action: 'instructor_application.submit',
          actorId: user.id,
          actorRole: user.role,
          targetType: 'instructor_application',
          targetId: application.id,
          after: { subjectIds },
        },
        ctx,
        tx,
      );
      return application;
    });
    return toDto(created);
  }

  async list(query: ApplicationListQuery): Promise<Paginated<AdminInstructorApplicationDto>> {
    const where: Prisma.InstructorApplicationWhereInput = { status: query.status };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.instructorApplication.findMany({
        where,
        // Oldest pending first, so the queue is worked in order.
        orderBy: { createdAt: query.status === ApplicationStatus.PENDING ? 'asc' : 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: this.adminSelect(),
      }),
      this.prisma.instructorApplication.count({ where }),
    ]);
    return { items: rows.map((r) => this.toAdminDto(r)), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<AdminInstructorApplicationDto> {
    const row = await this.prisma.instructorApplication.findUnique({ where: { id }, select: this.adminSelect() });
    if (!row) throw applicationNotFound();
    return this.toAdminDto(row);
  }

  /** Grants the chosen subjects, and makes a plain user an instructor, in one transaction. */
  async approve(
    actor: AuthUser,
    id: string,
    input: ApproveApplicationInput,
    ctx: RequestContext,
  ): Promise<AdminInstructorApplicationDto> {
    const application = await this.loadForDecision(id);
    assertCanDecide(application, actor.id);
    const requested = application.subjects.map((s) => s.subjectId);
    assertApprovedSubset(input.subjectIds, requested);

    await this.prisma.$transaction(async (tx) => {
      await this.markDecided(tx, id, ApplicationStatus.APPROVED, actor.id, input.note);
      await tx.instructorApplicationSubject.updateMany({
        where: { applicationId: id },
        data: { approved: false },
      });
      await tx.instructorApplicationSubject.updateMany({
        where: { applicationId: id, subjectId: { in: input.subjectIds } },
        data: { approved: true },
      });
      await tx.instructorSubject.createMany({
        data: input.subjectIds.map((subjectId) => ({ userId: application.userId, subjectId, grantedById: actor.id })),
        skipDuplicates: true,
      });
      const promoted = application.user.role.key === Role.USER;
      if (promoted) {
        await tx.user.update({ where: { id: application.userId }, data: { role: { connect: { key: Role.INSTRUCTOR } } } });
      }
      await this.audit.record(
        {
          action: 'instructor_application.approve',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'instructor_application',
          targetId: id,
          before: { status: ApplicationStatus.PENDING, role: application.user.role.key },
          after: {
            status: ApplicationStatus.APPROVED,
            subjectIds: input.subjectIds,
            role: promoted ? Role.INSTRUCTOR : application.user.role.key,
            note: input.note,
          },
        },
        ctx,
        tx,
      );
    });
    this.permissions.invalidateUser(application.userId);
    return this.get(id);
  }

  async reject(
    actor: AuthUser,
    id: string,
    input: RejectApplicationInput,
    ctx: RequestContext,
  ): Promise<AdminInstructorApplicationDto> {
    const application = await this.loadForDecision(id);
    assertCanDecide(application, actor.id);

    await this.prisma.$transaction(async (tx) => {
      await this.markDecided(tx, id, ApplicationStatus.REJECTED, actor.id, input.note);
      await tx.instructorApplicationSubject.updateMany({ where: { applicationId: id }, data: { approved: false } });
      await this.audit.record(
        {
          action: 'instructor_application.reject',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'instructor_application',
          targetId: id,
          before: { status: ApplicationStatus.PENDING },
          after: { status: ApplicationStatus.REJECTED, note: input.note },
        },
        ctx,
        tx,
      );
    });
    return this.get(id);
  }

  /** Admin override: replaces the subjects a user may teach. */
  async setUserSubjects(actor: AuthUser, userId: string, subjectIds: string[], ctx: RequestContext): Promise<void> {
    const [user, existing, found] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.instructorSubject.findMany({ where: { userId }, select: { subjectId: true } }),
      this.prisma.subject.count({ where: { id: { in: subjectIds } } }),
    ]);
    if (!user) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
    if (found !== subjectIds.length) throw badRequest('SUBJECT_NOT_FOUND', 'Có môn học không tồn tại');

    const before = existing.map((e) => e.subjectId);
    await this.prisma.$transaction(async (tx) => {
      await tx.instructorSubject.deleteMany({ where: { userId, subjectId: { notIn: subjectIds } } });
      await tx.instructorSubject.createMany({
        data: subjectIds.map((subjectId) => ({ userId, subjectId, grantedById: actor.id })),
        skipDuplicates: true,
      });
      await this.audit.record(
        {
          action: 'user.subjects_change',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'user',
          targetId: userId,
          before: { subjectIds: before },
          after: { subjectIds },
        },
        ctx,
        tx,
      );
    });
  }

  private async loadForDecision(id: string) {
    const application = await this.prisma.instructorApplication.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        subjects: { select: { subjectId: true } },
        user: { select: { role: { select: { key: true } } } },
      },
    });
    if (!application) throw applicationNotFound();
    return application;
  }

  private async markDecided(
    tx: Prisma.TransactionClient,
    id: string,
    status: ApplicationStatus,
    reviewerId: string,
    note: string | undefined,
  ): Promise<void> {
    // The status condition makes two reviewers deciding at the same time safe: only one update wins.
    const { count } = await tx.instructorApplication.updateMany({
      where: { id, status: ApplicationStatus.PENDING },
      data: { status, reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: note ?? null },
    });
    if (count === 0) throw conflict('APPLICATION_DECIDED', 'Đơn này đã được xử lý');
  }

  private adminSelect() {
    return {
      ...applicationSelect,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: { select: { key: true, name: true } },
          teachingSubjects: { orderBy: { subject: { name: 'asc' } }, select: { subject: { select: teachingSubjectSelect } } },
        },
      },
    } satisfies Prisma.InstructorApplicationSelect;
  }

  private toAdminDto(
    row: Prisma.InstructorApplicationGetPayload<{ select: ReturnType<InstructorsService['adminSelect']> }>,
  ): AdminInstructorApplicationDto {
    const { user, ...rest } = row;
    const { teachingSubjects, ...applicant } = user;
    return {
      ...toDto(rest),
      user: applicant,
      currentSubjects: teachingSubjects.map((t) => t.subject),
    };
  }
}
