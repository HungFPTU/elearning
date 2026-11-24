import { type ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { notFound } from '../app-exception.js';
import { AllExceptionsFilter } from './http-exception.filter.js';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn((_code: number) => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

describe('AllExceptionsFilter', () => {
  it('keeps the code from AppException', () => {
    expect(run(notFound('COURSE_NOT_FOUND', 'x')).body).toEqual({ statusCode: 404, message: 'x', code: 'COURSE_NOT_FOUND' });
  });

  it('derives a code for built-in Nest exceptions', () => {
    expect(run(new NotFoundException('missing')).body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('answers rate limiting in Vietnamese', () => {
    expect(run(new ThrottlerException()).body).toEqual({
      statusCode: 429,
      message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút',
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('hides details of unknown errors', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('db password leaked'));
    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).not.toContain('password');
  });
});
