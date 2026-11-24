---
name: qa-test-cases
description: Use when testing the E-Learning site, before saying a feature is done, before asking Bond to merge, or when Bond asks for test cases. Maintains docs/test-cases.md, runs the relevant cases against a live API and web app, and turns findings into bugs and automated tests.
---

# QA and test cases

`docs/test-cases.md` is the single list of test cases. It is written in Vietnamese for whoever tests by hand;
API names and error codes stay in English.

## When you add or change a feature
1. Add cases to the matching section (or a new section) **in the same change**: happy path, every error code
   the service can throw, permission denied, someone else's resource, and concurrency when money or status changes.
2. Each row: `ID | Mức | Bước | Kết quả mong đợi | Tự động | Lần chạy <date>`.
   IDs are `<AREA>-<nn>` and never reused. `Mức`: P0 money / data leak / auth / page down, P1 main feature,
   P2 polish.
3. Every P0 case needs an automated test (`unit` or `e2e`) before the PR is ready.

## Running the cases
- Start the stack: `docker compose up -d` (or in a cloud container: `service postgresql start; redis-server --daemonize yes`),
  `pnpm db:migrate && pnpm db:seed`, then `pnpm dev` (or `pnpm --filter @elearning/api build` and
  `node apps/api/dist/main` with the root `.env` loaded).
- API cases: use `curl` against `http://localhost:4000/api`; log in with the seed accounts (`Password123!`).
  The login route allows 10 requests per minute per IP, so space login-heavy checks out or reuse tokens.
- Web cases: Playwright (preinstalled in cloud sessions) at 1280 px and 375 px; check the console for errors.
- Record the run in the `Lần chạy` column: `Pass` or `Fail → BUG-n`. Do not mark a case you did not run.

## Things to always try (they found real bugs before)
- Same request twice, and the same request 5 times in parallel.
- Reusing a token or id after it should be dead (rotated refresh token, decided application, deleted role).
- Wrong case / extra spaces in emails and slugs; `%`, `_`, accents and 100+ characters in search.
- Extra fields in the body (`"role":"ADMIN"`), ids belonging to another user, another instructor or another tenant.
- Timing: does "user not found" answer faster than "wrong password"?
- Every error body: `{ statusCode, message, code }` with a Vietnamese `message`.

## When a case fails
Switch to the `bug-triage` skill: explain the bug to Bond (bị sao, vì sao nguy hiểm, giải pháp), fix it with a
regression test, and add it to the "Bug tìm được" section.

## Before saying work is done
`pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm --filter @elearning/api test:e2e` when the API changed,
plus the P0/P1 cases of the touched area. Report what you ran and what you did not.
