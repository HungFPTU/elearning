import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Throw this (or a subclass) for every expected error so the client always gets
 * `{ statusCode, message, code }`. `message` is user-facing (Vietnamese).
 */
export class AppException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ statusCode: status, message, code }, status);
  }
}

export const notFound = (code: string, message: string) => new AppException(HttpStatus.NOT_FOUND, code, message);
export const badRequest = (code: string, message: string) => new AppException(HttpStatus.BAD_REQUEST, code, message);
export const unauthorized = (code: string, message: string) => new AppException(HttpStatus.UNAUTHORIZED, code, message);
export const forbidden = (code: string, message: string) => new AppException(HttpStatus.FORBIDDEN, code, message);
export const conflict = (code: string, message: string) => new AppException(HttpStatus.CONFLICT, code, message);
