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

  describe('with seeded data (pnpm db:seed)', () => {
    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Password123!' })
        .expect(200);
      return res.body.accessToken as string;
    };

    it('GET /api/me returns the effective permissions', async () => {
      const token = await login('student@elearning.local');
      const res = await request(app.getHttpServer()).get('/api/me').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.role).toBe('USER');
      expect(res.body.permissions).toContain('course.learn');
      expect(res.body.permissions).not.toContain('admin.access');
    });

    it('blocks a plain user from the admin API', async () => {
      const token = await login('student@elearning.local');
      const res = await request(app.getHttpServer()).get('/api/admin/users').set('Authorization', `Bearer ${token}`).expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('lets an admin list users but not grant the admin role', async () => {
      const token = await login('admin@elearning.local');
      const list = await request(app.getHttpServer())
        .get('/api/admin/users?q=student@elearning.local')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const studentId = list.body.items[0].id as string;
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${studentId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ roleKey: 'ADMIN' })
        .expect(403);
      expect(res.body.code).toBe('PRIVILEGED_ROLE');
    });

    it('GET /api/categories returns the category -> subject tree', async () => {
      const res = await request(app.getHttpServer()).get('/api/categories').expect(200);
      const chemistry = res.body.find((c: { slug: string }) => c.slug === 'hoa-hoc');
      expect(chemistry.subjects.map((s: { slug: string }) => s.slug)).toContain('hoa-12');
    });

    it('keeps the instructor application queue and category admin away from plain users', async () => {
      const token = await login('student@elearning.local');
      await request(app.getHttpServer()).get('/api/admin/instructor-applications').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app.getHttpServer()).get('/api/admin/categories').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app.getHttpServer()).get('/api/me/instructor-applications').set('Authorization', `Bearer ${token}`).expect(200);
    });

    it('rejects login for a locked account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'hocvien11@elearning.local', password: 'Password123!' })
        .expect(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
    });
  });
});
