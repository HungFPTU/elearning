import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiError } from '@elearning/shared';
import type { Response } from 'express';

const DEFAULT_CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

/** Messages for framework errors that never carry our own Vietnamese text (e.g. the throttler's). */
const FIXED_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.TOO_MANY_REQUESTS]: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút',
};

/** Maps every error to the unified `{ statusCode, message, code }` body. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toApiError(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (!(exception instanceof HttpException)) {
      return { statusCode: 500, message: 'Đã có lỗi xảy ra, vui lòng thử lại sau', code: 'INTERNAL_ERROR' };
    }
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const fallbackCode = DEFAULT_CODES[statusCode] ?? 'ERROR';
    const fixedMessage = FIXED_MESSAGES[statusCode];
    if (fixedMessage) return { statusCode, message: fixedMessage, code: fallbackCode };

    if (typeof response === 'string') {
      return { statusCode, message: response, code: fallbackCode };
    }
    const r = response as { message?: unknown; code?: unknown };
    const message = Array.isArray(r.message)
      ? r.message.join('; ')
      : typeof r.message === 'string'
        ? r.message
        : exception.message;
    const code = typeof r.code === 'string' ? r.code : fallbackCode;
    return { statusCode, message, code };
  }
}
