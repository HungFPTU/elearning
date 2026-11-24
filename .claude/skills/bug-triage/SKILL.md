---
name: bug-triage
description: How to handle a bug in the E-Learning repo, whether Bond reports it or you find it while working. Reproduce, find the root cause, explain it to Bond (what breaks, why it matters, the fix), fix it with a regression test, and log it in docs/test-cases.md.
---

# Bug triage

Bond wants every bug **explained**, not just patched. Follow these steps in order.

## 1. Reproduce before touching code
- Get the smallest reproduction: one curl call, one e2e test, or one click path. Write it down.
- No reproduction yet: say so plainly, list what you tried, and fix only if the code clearly shows the defect
  (label it "found by reading the code, not reproduced").
- Screenshot from Bond: read the error text exactly. Check his environment first (`.env`, branch, stale
  `packages/shared/dist`, Docker running) before blaming the code.

## 2. Find the root cause, not the symptom
- Ask "why" until you reach the line that is wrong. A 500 is a symptom; "Prisma throws P2002 on the slug
  unique index and the service does not map it" is a cause.
- Look for the same mistake elsewhere: `grep` the pattern. One bug often has siblings.

## 3. Explain it to Bond (Vietnamese, casual), in this shape

```
**BUG-<n> · <one-line title>**
- Bị sao: <what the user sees, with the exact input that triggers it>
- Vì sao nguy hiểm: <who is hurt: money, data leak, lost users, wrong numbers>
- Nguyên nhân: <file:line and the wrong assumption>
- Giải pháp: <the fix, and why this fix over the alternatives>
- Đã kiểm tra: <the test or command that now passes>
```

Severity: `P0` money, data leak, auth or a whole page down · `P1` a main feature wrong · `P2` annoying.
P0 goes first, before any feature work.

## 4. Fix
- Branch `fix/<short-name>` off the branch the bug lives on (usually `main`).
- **Write the failing test first** (unit for a business rule, e2e for an HTTP contract), watch it fail, then fix.
- Keep the fix minimal; refactors go in a separate commit or PR.
- Commit: `fix(api): <what>` / `fix(web): <what>`.

## 5. Make sure it never comes back
- Add or update a case in `docs/test-cases.md` (`Fail → BUG-n`, then `Pass` once fixed) and append the bug to its
  "Bug tìm được" section with status.
- If the bug came from a missing convention, add the rule to `CLAUDE.md` in the same change.

## Common causes in this codebase (check these first)
- Stale shared build: `pnpm --filter @elearning/shared build` (root `db:*` scripts already do it).
- Next 16 `cacheComponents`: uncached data or `usePathname` outside `<Suspense>` breaks prerender.
- Permission cache: changes take up to 30 s unless `invalidateUser()` / `invalidateAll()` is called.
- Check-then-write races: use a conditional `updateMany` (`where: { id, status: 'PENDING' }`) and check `count`.
- Search: `contains` on raw columns instead of `searchText` + `searchWords()`.
