# E-Learning — project context & conventions

Read this file before doing any work in this repo, and follow it. When a rule here
changes, update this file in the same change.

## 1. What we are building

A website that sells online courses (Vietnamese market first).

- **Student**: sign up / sign in (email + Google), browse and search the catalog,
  preview free lessons, cart, checkout, watch video lessons, track progress, review courses.
- **Instructor**: create/edit courses (sections, lessons, video upload), see revenue.
- **Admin**: approve courses, manage users, orders, coupons, categories.
- **Payments**: VNPay first, then MoMo; Stripe later for international.

### MVP milestones
1. Monorepo, DB, auth, roles, public catalog pages  ← done in the scaffold
2. Catalog: course/section/lesson CRUD, list + detail pages
3. Cart, checkout, VNPay sandbox, auto-enroll after successful payment
4. Video player, lesson progress, student dashboard
5. Instructor + admin panels
6. Reviews, coupons, SEO, deploy

## 2. Communication

- Talk to the owner (Bond) in **Vietnamese**, casual tone.
- Code, identifiers, comments, commit messages, PR text: **English**.
- UI copy shown to end users: **Vietnamese**.

## 3. Repository layout

```
apps/
  web/        Next.js (App Router) frontend          → http://localhost:3000
  api/        NestJS REST API, prefix /api           → http://localhost:4000/api
packages/
  shared/     Types, enums, zod schemas shared by web + api
  config/     Shared tsconfig presets
docker-compose.yml   Postgres 16 + Redis 7 for local dev
```

Tooling: **pnpm workspaces** (root scripts use `pnpm -r`; no Turborepo, its Windows binary failed to spawn). Node >= 22. Run everything from the root:

| Command | What it does |
|---|---|
| `pnpm install` | install all workspaces (also generates the Prisma client) |
| `cp .env.example .env` | create local env (web also reads `apps/web/.env.local` for `NEXT_PUBLIC_*`) |
| `docker compose up -d` | start Postgres + Redis |
| `pnpm db:migrate` | apply Prisma migrations (dev) |
| `pnpm db:seed` | seed sample data: owner from `OWNER_EMAIL`, `admin@` / `instructor@` / `student@elearning.local` and more, ~15 courses, orders, reviews (password `Password123!`) |
| `pnpm dev` | run web + api in watch mode |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test` | across all workspaces |

## 4. Tech stack

- **Web**: Next.js 16 App Router with `cacheComponents` on, TypeScript strict, Tailwind CSS v4,
  shadcn-style UI primitives, TanStack Query for client data, react-hook-form + zod for forms.
- **API**: NestJS 12 (ESM only), Prisma 7 ORM with the `@prisma/adapter-pg` driver adapter,
  PostgreSQL, Redis (cache) + BullMQ (background jobs, from milestone 3), Vitest, oxlint.
  Auth = short-lived JWT access token (`@nestjs/jwt`) + opaque refresh token stored hashed
  in `refresh_tokens` and rotated on every refresh. No Passport.
- **Video**: Mux or Cloudflare Stream (HLS, signed playback). Never serve raw video files publicly.
- **Shared**: `@elearning/shared` holds enums, DTO types and zod schemas used on both sides.

## 5. Coding conventions

### General
- TypeScript `strict`. No `any` (use `unknown` + narrowing). No `@ts-ignore` without a comment why.
- Named exports; default export only where a framework requires it (Next.js pages/layouts).
- Files: `kebab-case.ts`. Classes/components/types: `PascalCase`. Vars/functions: `camelCase`.
  Constants/env keys: `UPPER_SNAKE_CASE`.
- Small functions, early returns, no dead code or commented-out code.
- Validate all external input at the boundary with **zod schemas from `@elearning/shared`**, used
  by both the web forms and the API, so the rules live in one place.

### API (apps/api)
- **ESM**: relative imports end in `.js` (`import { X } from './x.service.js'`); no `__dirname`.
- **One Nest module per domain**: `auth`, `users`, `courses`, `categories`, `cart`, `orders`,
  `payments`, `enrollments`, `progress`, `reviews`, `coupons`, `admin`.
  Each has `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `*.service.spec.ts` for business rules.
- **Validation**: pass the shared zod schema to the param decorator:
  `@Body({ schema: registerSchema }) body: RegisterInput`, `@Query({ schema: courseListQuerySchema })`.
  The global `StandardSchemaValidationPipe` turns failures into `400 VALIDATION_ERROR`.
- **Controllers are thin**: parse input, call a service, return the result. No Prisma in controllers.
- **Prisma only in services** via the injected `PrismaService`. Use `select`/`include`
  deliberately; never return `passwordHash` or other secrets.
- Auth: global `JwtAuthGuard`; mark open routes with `@Public()`. Restrict by **permission**, never by role
  name: `@RequirePermission('course.moderate')` (global `PermissionsGuard`; class + method decorators add up).
  Get the current user with `@CurrentUser()`: `{ id, role, permissions }`, loaded from the DB, not the token.
  See "Roles and permissions" below.
- **Audit log**: every admin action and auth event calls `AuditService.record(entry, ctx, tx)` inside the
  same transaction as the change. Get `ctx` (ip, user agent, request id) with `@ReqContext()`.
  New action codes go into `AUDIT_ACTION_LABELS` in `@elearning/shared`.
- **Unified error format** (global `AllExceptionsFilter`):
  `{ "statusCode": number, "message": string, "code": string }` where `code` is
  UPPER_SNAKE (e.g. `COURSE_NOT_FOUND`) and `message` is Vietnamese, user-facing.
  Throw with the helpers in `src/common/app-exception.ts`: `notFound('COURSE_NOT_FOUND', 'Không tìm thấy khóa học')`.
  Unknown errors become `500 INTERNAL_ERROR` without leaking details.
- **Search**: never `contains` on raw columns. Filter on the trigger-maintained `searchText` column
  (lowercased, accent-free, trigram-indexed) with `searchWords(q)` from `@elearning/shared`:
  `AND: searchWords(q).map((w) => ({ searchText: { contains: w } }))`. Words match by prefix,
  without accents ("hoa" finds "Hóa học"). A new searchable table gets the same column, trigger and GIN index.
- REST naming: plural nouns (`/courses/:slug`, `/me/enrollments`), pagination with
  `?page=&pageSize=` returning `{ items, total, page, pageSize }`.
- Config only through `ConfigService`; every env var listed in `.env.example`.

### Web (apps/web)
- Next 16 differs from older versions: read `apps/web/node_modules/next/dist/docs/` before using an API
  you are unsure about. `params`/`searchParams` are Promises; use the generated `PageProps<'/route'>` types.
- `cacheComponents` is on: wrap anything that awaits uncached data (API fetches, `searchParams`) in
  `<Suspense>`, and don't call `new Date()`/`Math.random()` during prerender.
- Server Components by default; add `"use client"` only for interactivity.
- Data: server components fetch via `api.*` in `lib/api.ts`; client components use TanStack Query hooks
  and `useAuth().authFetch` for authenticated calls (it refreshes the token once on 401).
- Auth state: `components/providers/auth-provider.tsx`. MVP stores tokens in localStorage;
  moving them to httpOnly cookies is planned for milestone 3.
- Forms: react-hook-form + zod schema from `@elearning/shared` when one exists.
- UI primitives in `components/ui` (shadcn style); feature components in `components/<feature>`.
- Format money with `formatVnd()` from `@elearning/shared`; never format by hand.

### Roles and permissions
- Permission catalog: `PERMISSIONS` in `packages/shared/src/permissions.ts`. Adding a key there is all it
  takes; the API syncs it into the `permissions` table on boot. Default grants for the system roles live in
  `DEFAULT_ROLE_PERMISSIONS` (applied only to a system role that has no permissions yet).
- Roles: `USER` (default on sign-up) < `INSTRUCTOR` (own courses) < `ADMIN` (everything except permission
  management) < `OWNER` (everything, bypasses checks). Owners can create custom roles.
- Effective permissions = role permissions + user `GRANT` overrides − `DENY` overrides; DENY wins.
  Logic in `apps/api/src/access/resolve-permissions.ts`, cached 30 s in `PermissionsService`; call
  `invalidateUser(id)` / `invalidateAll()` after changing roles, overrides or status.
- Who may change whom lives in `apps/api/src/admin/admin-rules.ts`: only an owner grants or removes
  ADMIN/OWNER or touches admin accounts, there is always at least one owner, nobody locks themselves or an
  owner, and a non-owner can never grant a permission they do not hold.
- Web: `useAuth().can('perm')` to show or hide UI. It is only a hint; the API always enforces.
- The owner account comes from `OWNER_EMAIL` in `.env` (seed only). Never hard-code it.

### Database (Prisma)
- Schema in `apps/api/prisma/schema.prisma`, config in `apps/api/prisma.config.ts` (reads the root `.env`).
  The client is generated into `apps/api/src/generated/prisma` (git-ignored; `pnpm install` regenerates it).
  Import it from `../generated/prisma/client.js`.
- Models `PascalCase`, fields `camelCase`,
  tables mapped to `snake_case` plural via `@@map`.
- Every model has `id` (cuid), `createdAt`, `updatedAt`.
- **Money is an integer number of VND** (`Int`), never float/decimal in app code.
- **All times stored and handled in UTC**; convert to Asia/Ho_Chi_Minh only for display.
- Schema change = new migration (`pnpm db:migrate --name <change>`). Never edit an applied migration.

### Payments (critical)
- Verify the gateway signature on every IPN/return callback before trusting any field.
- Handlers must be **idempotent**: processing the same IPN twice changes nothing
  (check `Payment.status` / unique `providerTxnId`).
- Re-check amount against our `Order.total`; mismatch → reject.
- Mark order paid **and** create enrollments in a **single DB transaction**, only after
  a successful, verified payment. Never enroll from the browser return URL alone.
- Log every callback payload (minus secrets) for audit.

### Security
- Never commit secrets. `.env` is git-ignored; keep `.env.example` complete and up to date.
- Hash passwords with bcrypt. Rate-limit auth endpoints.
- Check ownership on every instructor action (an instructor edits only their own courses).
- Lesson video URLs are only returned to enrolled users (or for `isPreview` lessons).

## 6. Testing
- API (Vitest, `vi.fn()` not `jest.fn()`): unit tests `*.spec.ts` next to the code for business
  rules (payments, enrollment, pricing); e2e in `apps/api/test/` (`pnpm --filter @elearning/api test:e2e`,
  needs Postgres). Web: test non-trivial logic/hooks.
- Run `pnpm typecheck && pnpm lint && pnpm test` before saying work is done.

## 7. Git workflow
- Branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>` off `main`.
- **Conventional Commits**: `feat(api): add VNPay IPN handler`, `fix(web): ...`, `chore: ...`.
- **Ask Bond before pushing, opening a PR or merging.**
- Keep PRs focused on one milestone item.

## 8. Screens
Every page and its route is listed in `docs/screens.md`. Read it before adding a page, and update it
in the same change that adds, renames or removes one.

## 9. Workflow for a new feature
See `.claude/skills/add-feature/SKILL.md`.
