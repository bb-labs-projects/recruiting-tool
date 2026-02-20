---
phase: 04-employer-onboarding-and-browse
plan: 02
subsystem: employer-registration-flow
tags: [employer, registration, approval-gating, useActionState, server-components, shadcn-ui]
requires: ["04-01"]
provides: ["employer-registration-flow", "approval-status-pages", "page-level-gating"]
affects: ["04-03", "04-04"]
key-files:
  created:
    - src/app/(authenticated)/employer/register/page.tsx
    - src/app/(authenticated)/employer/pending/page.tsx
    - src/app/(authenticated)/employer/rejected/page.tsx
    - src/components/employer/registration-form.tsx
    - src/components/employer/approval-banner.tsx
  modified:
    - src/app/(authenticated)/employer/layout.tsx
    - src/app/(authenticated)/employer/page.tsx
    - src/actions/employers.ts
completed: 2026-02-20
duration: ~5 min
---

## Summary

Employer registration flow with approval-gated layout: registration form using useActionState, pending/rejected status pages with page-level DAL checks, and a reusable approval banner component -- enforcing AUTH-04 that employer accounts require admin approval before browsing.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Employer layout with approval gating and status pages | dab2c05 | layout.tsx, page.tsx, register/page.tsx, pending/page.tsx, rejected/page.tsx |
| 2 | Registration form and approval banner components | 7a7b27f | registration-form.tsx, approval-banner.tsx, employers.ts |

## Key Decisions

- **Page-level gating over layout gating:** Since Next.js layouts do not re-render on client-side navigation and cannot reliably read the current pathname, approval-status gating is handled at the page level. Each page independently checks the employer profile status via DAL and redirects accordingly. The layout only verifies the employer role.
- **useActionState signature update for registerEmployer:** The existing `registerEmployer(formData)` action was updated to accept `(prevState, formData)` to be compatible with React 19's `useActionState` hook, matching the established pattern from `requestMagicLink`.
- **RegisterEmployerState type export:** Added exported type `RegisterEmployerState` to `src/actions/employers.ts` for type-safe form state handling in the client component.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated registerEmployer action signature for useActionState compatibility**

- **Found during:** Task 2
- **Issue:** The existing `registerEmployer` server action accepted only `(formData: FormData)` but React 19's `useActionState` requires `(prevState, formData)` signature
- **Fix:** Added `_prevState: RegisterEmployerState` parameter and exported `RegisterEmployerState` type
- **Files modified:** `src/actions/employers.ts`
- **Commit:** 7a7b27f

**2. [Note] Task 1 files were already committed in prior session**

- Task 1 files (layout, page, register, pending, rejected pages) were already committed as `dab2c05` in a prior agent session. The code matched the plan requirements exactly, so no additional commit was needed for Task 1.

## Verification Results

1. `npx tsc --noEmit` passes with zero errors
2. New employer (no profile row) visiting /employer is redirected to /employer/register
3. After registration, employer is redirected to /employer/pending (via useEffect + useRouter)
4. Pending employer cannot access /employer dashboard (redirected to /employer/pending)
5. Rejected employer sees rejection reason on /employer/rejected
6. Approved employer can access /employer dashboard normally
7. No circular redirect loops exist between any status pages (verified by tracing all redirect paths)

## Duration

~5 minutes
