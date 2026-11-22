import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from '@elearning/shared';
import { unauthorized } from '../app-exception.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

interface AccessTokenPayload {
  sub: string;
  role: Role;
}

/** Global guard: every route needs a valid Bearer access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractToken(req);

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
        req.user = { id: payload.sub, role: payload.role };
      } catch {
        if (!isPublic) throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập đã hết hạn');
      }
    }
    if (isPublic) return true;
    if (!req.user) throw unauthorized('UNAUTHENTICATED', 'Vui lòng đăng nhập');
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
