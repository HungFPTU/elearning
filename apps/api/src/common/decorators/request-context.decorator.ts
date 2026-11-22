import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Who made the request and from where; stored with every audit log entry. */
export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export function requestContextOf(req: Request): RequestContext {
  const requestId = req.headers['x-request-id'];
  return {
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
    requestId: typeof requestId === 'string' ? requestId : null,
  };
}

export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => requestContextOf(ctx.switchToHttp().getRequest<Request>()),
);
