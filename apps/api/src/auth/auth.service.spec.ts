import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, REFRESH_REUSE_GRACE_MS } from './auth.service.js';

const ctx: RequestContext = { ip: '127.0.0.1', userAgent: 'vitest', requestId: 'req-1' };

function setup() {
  const refreshToken = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const prisma = {
    user: { findUnique: vi.fn() },
    refreshToken,
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({ refreshToken })),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const jwt = { signAsync: vi.fn().mockResolvedValue('access-token') };
  const config = { get: vi.fn().mockReturnValue(30) };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService<never, true>,
    audit as unknown as AuditService,
  );
  return { service, prisma, refreshToken, audit };
}

const storedToken = (overrides: { revokedAt?: Date | null; status?: string } = {}) => ({
  id: 'rt-1',
  userId: 'user-1',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: overrides.revokedAt ?? null,
  user: { id: 'user-1', status: overrides.status ?? 'ACTIVE' },
});

afterEach(() => vi.restoreAllMocks());

describe('AuthService.login', () => {
  it('runs bcrypt even when the email is unknown, so timing does not reveal accounts', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    const compare = vi.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

    await expect(service.login({ email: 'nobody@x.vn', password: 'Password123!' }, ctx)).rejects.toMatchObject({
      response: { code: 'INVALID_CREDENTIALS' },
    });
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('rejects an account without a password even if the dummy hash were to match', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash: null, status: 'ACTIVE' });
    vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    await expect(service.login({ email: 'google@x.vn', password: 'whatever' }, ctx)).rejects.toMatchObject({
      response: { code: 'INVALID_CREDENTIALS' },
    });
  });
});

describe('AuthService.refresh', () => {
  it('rotates a valid token', async () => {
    const { service, refreshToken } = setup();
    refreshToken.findUnique.mockResolvedValue(storedToken());
    refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const tokens = await service.refresh('token', ctx);

    expect(tokens.accessToken).toBe('access-token');
    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'rt-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('issues nothing to the loser of two concurrent refreshes', async () => {
    const { service, refreshToken } = setup();
    refreshToken.findUnique.mockResolvedValue(storedToken());
    refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('token', ctx)).rejects.toMatchObject({ response: { code: 'INVALID_REFRESH_TOKEN' } });
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('revokes every session and audits when a rotated token is reused', async () => {
    const { service, refreshToken, audit } = setup();
    const revokedAt = new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1_000);
    refreshToken.findUnique.mockResolvedValue(storedToken({ revokedAt }));
    refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.refresh('token', ctx)).rejects.toMatchObject({ response: { code: 'INVALID_REFRESH_TOKEN' } });
    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.refresh_reuse', targetId: 'user-1' }),
      ctx,
      expect.anything(),
    );
  });

  it('treats a reuse within the grace window as a concurrent tab, not theft', async () => {
    const { service, refreshToken, audit } = setup();
    refreshToken.findUnique.mockResolvedValue(storedToken({ revokedAt: new Date() }));

    await expect(service.refresh('token', ctx)).rejects.toMatchObject({ response: { code: 'INVALID_REFRESH_TOKEN' } });
    expect(refreshToken.updateMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('refuses a locked account', async () => {
    const { service, refreshToken } = setup();
    refreshToken.findUnique.mockResolvedValue(storedToken({ status: 'LOCKED' }));

    await expect(service.refresh('token', ctx)).rejects.toMatchObject({ response: { code: 'ACCOUNT_LOCKED' } });
    expect(refreshToken.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  it('deletes the token so a later reuse is not mistaken for theft', async () => {
    const { service, refreshToken } = setup();
    refreshToken.findUnique.mockResolvedValue({ id: 'rt-1', revokedAt: null, userId: 'user-1' });

    await service.logout('token', ctx);

    expect(refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
  });
});
