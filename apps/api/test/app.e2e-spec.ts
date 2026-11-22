import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Needs a running Postgres with migrations applied (see CLAUDE.md).
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
  });

  it('GET /api/me without token returns the unified error body', () => {
    return request(app.getHttpServer())
      .get('/api/me')
      .expect(401)
      .expect({ statusCode: 401, message: 'Vui lòng đăng nhập', code: 'UNAUTHENTICATED' });
  });

  it('POST /api/auth/login validates input', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'x' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
