# E-Learning

Website bán khóa học online: Next.js (web) + NestJS (api) + PostgreSQL, monorepo pnpm workspaces.

## Chạy local

```bash
pnpm install
cp .env.example .env
cp .env.example apps/web/.env.local   # web chỉ cần NEXT_PUBLIC_API_URL
docker compose up -d                  # Postgres + Redis
pnpm db:migrate                       # tạo bảng
pnpm db:seed                          # dữ liệu mẫu
pnpm dev                              # web: http://localhost:3000, api: http://localhost:4000/api
```

Tài khoản mẫu (mật khẩu `Password123!`): `admin@elearning.local`, `instructor@elearning.local`, `student@elearning.local`.

Bối cảnh dự án và quy ước code: xem [CLAUDE.md](./CLAUDE.md).
