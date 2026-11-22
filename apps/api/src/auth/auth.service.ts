import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { type AuthResponse, type AuthTokens, type LoginInput, type RegisterInput, Role, UserStatus } from '@elearning/shared';
import { AuditService } from '../audit/audit.service.js';
import { conflict, forbidden, unauthorized } from '../common/app-exception.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, toUserDto } from '../users/users.service.js';

const BCRYPT_ROUNDS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const accountLocked = () => forbidden('ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  /** New accounts always start as a plain user; becoming an instructor needs an application. */
  async register(input: RegisterInput, ctx: RequestContext): Promise<AuthResponse> {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (exists) throw conflict('EMAIL_TAKEN', 'Email này đã được sử dụng');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: input.email, fullName: input.fullName, passwordHash, role: { connect: { key: Role.USER } } },
        select: publicUserSelect,
      });
      await this.audit.record(
        { action: 'auth.register', actorId: created.id, actorRole: Role.USER, targetType: 'user', targetId: created.id },
        ctx,
        tx,
      );
      return created;
    });
    return { user: toUserDto(user), ...(await this.issueTokens(user.id)) };
  }

  async login(input: LoginInput, ctx: RequestContext): Promise<AuthResponse> {
    const found = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { ...publicUserSelect, status: true, passwordHash: true },
    });
    const valid = found?.passwordHash ? await bcrypt.compare(input.password, found.passwordHash) : false;
    if (!found || !valid) {
      await this.audit.record(
        {
          action: 'auth.login_failed',
          actorId: found?.id ?? null,
          targetType: 'user',
          targetId: found?.id ?? null,
          after: found ? undefined : { email: input.email },
        },
        ctx,
      );
      throw unauthorized('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    }
    if (found.status === UserStatus.LOCKED) throw accountLocked();

    const { passwordHash: _hash, status: _status, ...user } = found;
    await this.audit.record(
      { action: 'auth.login', actorId: user.id, actorRole: user.role.key, targetType: 'user', targetId: user.id },
      ctx,
    );
    return { user: toUserDto(user), ...(await this.issueTokens(user.id)) };
  }

  /** Rotates the refresh token: the old one is revoked and a new pair is issued. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { select: { id: true, status: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized('INVALID_REFRESH_TOKEN', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }
    if (stored.user.status === UserStatus.LOCKED) throw accountLocked();
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user.id);
  }

  async logout(refreshToken: string, ctx: RequestContext): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      select: { id: true, revokedAt: true, userId: true },
    });
    if (!stored || stored.revokedAt) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      await this.audit.record(
        { action: 'auth.logout', actorId: stored.userId, targetType: 'user', targetId: stored.userId },
        ctx,
        tx,
      );
    });
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId });
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + ttlDays * DAY_MS) },
    });
    return { accessToken, refreshToken };
  }
}
