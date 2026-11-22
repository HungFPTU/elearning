import { Injectable } from '@nestjs/common';
import type { AuditLogDto, AuditLogQuery, Paginated } from '@elearning/shared';
import { Prisma } from '../generated/prisma/client.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditEntry {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}

type Db = Pick<PrismaService, 'auditLog'> | Prisma.TransactionClient;

const toJson = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined || value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

/** Append-only log of who did what. Pass the transaction client so the log commits with the change. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, ctx: RequestContext, db: Db = this.prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        before: toJson(entry.before),
        after: toJson(entry.after),
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
      },
    });
  }

  async list(query: AuditLogQuery): Promise<Paginated<AuditLogDto>> {
    const where: Prisma.AuditLogWhereInput = {
      actorId: query.actorId,
      action: query.action ? { startsWith: query.action } : undefined,
      targetType: query.targetType,
      targetId: query.targetId,
      createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { actor: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        actor: r.actor,
        actorRole: r.actorRole,
        targetType: r.targetType,
        targetId: r.targetId,
        before: r.before,
        after: r.after,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
