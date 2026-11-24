---
name: backend-review
description: Use before committing or opening a PR that touches apps/api, packages/shared or the Prisma schema of the E-Learning repo, and when Bond asks for a backend review. A checklist for permissions, data isolation, transactions, payments, performance and migrations.
---

# Backend review checklist

Go through every section that the diff touches. For each problem found, report it the `bug-triage` way
(bị sao, vì sao nguy hiểm, giải pháp) and fix it before calling the work done.

## Access
- Route is `@Public()` on purpose, or carries `@RequirePermission('<key>')`. Never check a role name.
- New permission key added to `PERMISSIONS` and to `DEFAULT_ROLE_PERMISSIONS` where it belongs.
- Ownership checked in the service: an instructor touches only their own courses; a user reads only their own
  orders, enrollments, progress. Someone else's id returns 404, not 403 (do not confirm it exists).
- Admin "who may change whom" goes through `admin/admin-rules.ts`, with a unit test.
- After changing roles, overrides or status: `invalidateUser(id)` or `invalidateAll()`.

## Input and output
- Body and query validated with a shared zod schema through `@Body({ schema })` / `@Query({ schema })`.
- Every string has a max length, every list a max size, every number a range. Pagination capped.
- `select` lists the fields; never `passwordHash`, token hashes, merchant secrets or lesson video URLs for
  users who are not enrolled (except `isPreview`).
- Errors thrown with `app-exception.ts` helpers, UPPER_SNAKE `code`, Vietnamese `message`.

## Data integrity
- Several writes that must succeed together run in one `$transaction`, including the `AuditService.record(..., tx)`.
- Check-then-write on status or balance uses a conditional `updateMany` and checks `count` (no race).
- Unique violations (`P2002`) are mapped to a 409 with a clear code.
- Money is an `Int` of VND; splits round down for the payee and the remainder is accounted for.
- Times are UTC in the DB and in code.

## Payments (whenever orders, payments, ledger or enrollments change)
- Gateway signature verified before reading any field; amount re-checked against `Order.total`.
- Idempotent on `providerTxnId`: the same IPN twice changes nothing.
- Order PAID + enrollments + ledger entries in one transaction, only from the verified IPN, never from the
  browser return URL. Callback payload logged without secrets.

## Multi-tenant readiness
- New tables that belong to a site will get `tenantId` (see the business doc); do not design anything that assumes
  one global site (global unique slugs or emails, cache keys without a scope, files in one flat folder).

## Performance
- No query inside a loop; use `include`/`select` or one `findMany` with `in`.
- Lists are paginated; filters and sorts have an index; search uses `searchText` + `searchWords()`.
- `count` and `findMany` for a page run in parallel (`Promise.all` or `$transaction([...])`).

## Migrations
- New migration, never edit an applied one. Read the generated SQL: no accidental `DROP`, data backfilled
  before a column becomes `NOT NULL`, big indexes considered.

## Tests
- Business rules have `*.service.spec.ts` / rule specs with `vi.fn()`; HTTP contracts and permission checks have e2e.
- `pnpm typecheck && pnpm lint && pnpm test` and `pnpm --filter @elearning/api test:e2e` pass.
