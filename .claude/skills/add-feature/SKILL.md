---
name: add-feature
description: Step-by-step workflow for adding a feature or domain module to the E-Learning monorepo (NestJS api + Next.js web). Use whenever starting new feature work in this repo.
---

# Add a feature to E-Learning

Always read `CLAUDE.md` first. Then:

1. **Clarify scope** in Vietnamese with Bond if the ask is ambiguous; otherwise pick
   the most likely reading and state it.
2. **Branch**: `git checkout -b feat/<short-name>` from an up-to-date `main`.
3. **Data model** (if needed): edit `apps/api/prisma/schema.prisma` following the DB rules
   (cuid ids, timestamps, `@@map` snake_case, money as Int VND), then
   `pnpm db:migrate --name <change>`.
4. **Shared contract**: add enums / types / zod schemas to `packages/shared/src`, export
   them from `index.ts`.
5. **API module** in `apps/api/src/<domain>/`:
   - input validated with the shared zod schema: `@Body({ schema })` / `@Query({ schema })`
   - `<domain>.service.ts`: all Prisma + business rules, throws with the `app-exception.ts` helpers
   - `<domain>.controller.ts`: thin; `@Public()` or `@RequirePermission('...')` as needed
     (new permission? add it to `PERMISSIONS` and `DEFAULT_ROLE_PERMISSIONS` in shared)
   - record admin/sensitive actions with `AuditService.record(..., tx)` in the same transaction
   - register the module in `app.module.ts`
   - unit test the service's business rules
6. **Web**: API call in `apps/web/lib/api.ts` (or a query hook), page under `app/`,
   components under `components/<feature>`. Vietnamese UI copy. Add the page to `docs/screens.md`.
7. **Env**: any new variable goes into `.env.example` with a comment.
8. **Verify**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
9. **Commit** with Conventional Commits. **Ask Bond before pushing or opening a PR.**
10. Update `CLAUDE.md` if a convention changed or a new one was introduced.
