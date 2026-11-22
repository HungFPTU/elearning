import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UserStatus } from '@elearning/shared';
import { PermissionsService } from '../../access/permissions.service.js';
import { forbidden, unauthorized } from '../app-exception.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

interface AccessTokenPayload {
  sub: string;
}

/**
 * Global guard: every route needs a valid Bearer access token unless marked @Public().
 * Role, status and permissions are loaded from the DB (cached) so changes apply without a new token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = await this.authenticate(req, isPublic === true);

    if (user) req.user = user;
    if (isPublic) return true;
    if (!user) throw unauthorized('UNAUTHENTICATED', 'Vui lòng đăng nhập');
    return true;
  }

  /** On public routes a bad token or locked account just means "anonymous" instead of an error. */
  private async authenticate(req: Request, isPublic: boolean): Promise<AuthUser | undefined> {
    const token = this.extractToken(req);
    if (!token) return undefined;

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      if (isPublic) return undefined;
      throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập đã hết hạn');
    }

    const access = await this.permissions.getAccess(payload.sub);
    if (!access) {
      if (isPublic) return undefined;
      throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập đã hết hạn');
    }
    if (access.status === UserStatus.LOCKED) {
      if (isPublic) return undefined;
      throw forbidden('ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');
    }
    return { id: payload.sub, role: access.roleKey, permissions: new Set(access.permissions) };
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
