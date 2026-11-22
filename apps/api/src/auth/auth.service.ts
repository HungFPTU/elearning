import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AuthResponse, AuthTokens, LoginInput, RegisterInput, Role } from '@elearning/shared';
import { conflict, unauthorized } from '../common/app-exception.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect } from '../users/users.service.js';

const BCRYPT_ROUNDS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (exists) throw conflict('EMAIL_TAKEN', 'Email này đã được sử dụng');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      },
      select: publicUserSelect,
    });
    return { user, ...(await this.issueTokens(user.id, user.role)) };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const found = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { ...publicUserSelect, passwordHash: true },
    });
    const valid = found?.passwordHash ? await bcrypt.compare(input.password, found.passwordHash) : false;
    if (!found || !valid) throw unauthorized('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');

    const { passwordHash: _omit, ...user } = found;
    return { user, ...(await this.issueTokens(user.id, user.role)) };
  }

  /** Rotates the refresh token: the old one is revoked and a new pair is issued. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized('INVALID_REFRESH_TOKEN', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user.id, stored.user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, role: Role): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, role });
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + ttlDays * DAY_MS) },
    });
    return { accessToken, refreshToken };
  }
}
