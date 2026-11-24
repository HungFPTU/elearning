---
name: ui-design
description: Use when building or changing any page or component in apps/web of the E-Learning site. Covers layout, the UI primitives, states, Vietnamese copy, mobile, accessibility, and how to check the result visually.
---

# UI design for E-Learning web

Goal: a clean, trustworthy course store. Students decide to pay based on how professional it looks.

## Building blocks
- Primitives live in `apps/web/components/ui` (shadcn style: `button`, `input`, `select`, `card`, `badge`).
  Reuse them; add a new primitive there instead of styling a one-off `<button>` inside a feature.
- Feature components go in `components/<feature>`. Pages stay thin.
- Tailwind v4 only, no inline `style`, no hex colors. Current palette: `slate` for text and borders
  (`text-slate-900` headings, `text-slate-600`/`500` body and hints, `border-slate-200`), `indigo` for the brand
  and links, `red` for errors and destructive actions, `emerald` for success. Stay inside it; if a new color
  role is needed, add it as a theme variable in `app/globals.css` (`@theme`) and use that everywhere.
- Spacing on a 4 px grid (`gap-2`, `p-4`, `p-6`). One max content width per page type (catalog, detail, admin).
- Money: `formatVnd()`. Dates: `formatDate()` / `formatDateTime()` in `lib/utils.ts`, shown in Asia/Ho_Chi_Minh.

## Every data view has four states
Loading (skeleton the size of the content, not a spinner in a blank page), empty (one sentence + the next action),
error (Vietnamese message from the API `message`, plus "Thử lại"), and success.
Keep previous data while refetching (`keepPreviousData`) so lists do not flash.

## Copy
- Vietnamese, short, polite, `bạn`. Buttons are verbs: "Lưu thay đổi", "Gửi đơn", "Mua khóa học".
- Say what happened and what to do next: "Email này đã được dùng. Đăng nhập?" rather than "Lỗi 409".
- Use typographic quotes “ ” in JSX text (lint rejects raw `"`).

## Layout and responsiveness
- Design at 375 px first, then 768 and 1280. No horizontal scroll at 375 px.
- Tables in admin collapse to cards or scroll inside their own container on mobile.
- Primary action is visually unique on the page; destructive actions are red and ask for confirmation.

## Accessibility
- Every input has a `<label>`; errors are linked with `aria-describedby`.
- Focus ring visible; full keyboard path through forms; Enter submits.
- Color contrast AA; never use color alone to show status (add text or an icon).
- Images have `alt`; course covers use `next/image` with explicit sizes.

## Next 16 rules that bite
- `cacheComponents` is on: anything awaiting `params`, `searchParams` or uncached fetches sits inside `<Suspense>`.
- `usePathname` / `useSearchParams` in a client component also go under `<Suspense>`.
- Read `apps/web/node_modules/next/dist/docs/` before using an API you are unsure about.

## Check it visually before saying done
Run the app, open the page with Playwright at 375 and 1280 px, take screenshots, and look at them: alignment,
overflow, empty and error states, dark text on dark backgrounds. Check the browser console is clean.
Update `docs/screens.md` when a page is added or renamed.
