# Screens and routes

Source of truth for every page of the web app (`apps/web/app`). Update this file in the same
change that adds, renames or removes a page. Access is decided by **permissions** (see
`CLAUDE.md` → Roles and permissions), the "Who" column only names the default role that has them.

Status: `done` = exists in code · a number = MVP milestone that builds it.

## Public

| Screen | Route | Who | Status |
|---|---|---|---|
| Home | `/` | everyone | done |
| Course catalog (search, filters) | `/courses` | everyone | done |
| Category page: its subjects and courses | `/categories/[slug]` | everyone | 2 |
| Subject page: courses of one subject | `/categories/[slug]/[subjectSlug]` | everyone | 2 |
| Course detail | `/courses/[slug]` | everyone | done |
| Instructor public profile | `/instructors/[id]` | everyone | 6 |
| Sign in / sign up | `/login`, `/register` | everyone | done |
| Forgot / reset password | `/forgot-password`, `/reset-password` | everyone | 2 |
| Terms, privacy, contact | `/terms`, `/privacy`, `/contact` | everyone | 6 |
| Not found | automatic | everyone | done |

## Signed-in user (student)

| Screen | Route | Who | Status |
|---|---|---|---|
| Account: profile, password | `/account` | user | 2 |
| Apply to become an instructor, see application status | `/become-instructor` | user | 2 |
| Cart | `/cart` | user | 3 |
| Checkout, payment result | `/checkout`, `/checkout/result` | user | 3 |
| Order history | `/orders` | user | 3 |
| My courses | `/my-courses` | user | 4 |
| Lesson player (video, lesson list, attachments, quiz) | `/learn/[slug]/[lessonId]` | enrolled user | 4 |

## Instructor

| Screen | Route | Who | Status |
|---|---|---|---|
| Instructor overview | `/instructor` | instructor | 2 |
| My courses | `/instructor/courses` | instructor | 2 |
| New course | `/instructor/courses/new` | instructor | 2 |
| Course info (title, category, subject, price, cover) | `/instructor/courses/[id]` | owner of the course | 2 |
| Curriculum builder (sections, lessons, uploads) | `/instructor/courses/[id]/curriculum` | owner of the course | 2 |
| Course settings (access rules, drip, certificate) | `/instructor/courses/[id]/settings` | owner of the course | 4 |
| Moderation history of a course | `/instructor/courses/[id]/reviews` | owner of the course | 2 |
| Revenue and students | `/instructor/revenue` | instructor | 5 |

## Admin and owner

| Screen | Route | Who | Status |
|---|---|---|---|
| Dashboard (links now, stats in milestone 5) | `/admin` | admin | done |
| Users list | `/admin/users` | admin | done |
| User detail: role, permission overrides, lock | `/admin/users/[id]` | admin | done |
| Roles and their permissions | `/admin/roles`, `/admin/roles/[key]` | owner edits, admin views | done |
| Instructor applications | `/admin/instructor-applications` | admin | 2 |
| Course moderation queue | `/admin/courses` | admin | 2 |
| Review one course submission | `/admin/courses/[id]/review` | admin | 2 |
| Categories and subjects tree | `/admin/categories` | admin | 2 |
| Audit log | `/admin/audit-logs` | admin | done |
| Orders, refunds | `/admin/orders` | admin | 5 |
| Media library | `/admin/media` | admin | 5 |
| Coupons | `/admin/coupons` | admin | 6 |
| Course reviews moderation | `/admin/reviews` | admin | 6 |
