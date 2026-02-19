---
phase: 01-foundation-and-auth
plan: 05
subsystem: auth-ui
tags: [auth, magic-link, client-components, react-19, useActionState, shadcn-ui, playwright, e2e]
depends_on:
  - "01-03: Server action (requestMagicLink), API routes (verify, logout), session management"
  - "01-04: Route groups, layouts, placeholder login/verify pages"
provides:
  - "MagicLinkForm client component with useActionState server action integration"
  - "MagicLinkVerify two-step token verification with email prefetch protection"
  - "LogoutButton component with session cleanup and redirect"
  - "Complete auth UI wired into public pages and authenticated layouts"
  - "19 Playwright e2e tests covering public pages, proxy routing, role-based isolation"
affects:
  - "Phase 2+: All authenticated pages inherit LogoutButton from layouts"
  - "Future UI work builds on established shadcn Card/form patterns"
  - "Playwright test suite provides regression safety for future changes"
tech_stack:
  added:
    - "@playwright/test (dev, e2e testing)"
  patterns:
    - "React 19 useActionState for server action forms (NOT useFormState)"
    - "Two-step token verification: page load shows button, POST consumes token"
    - "Client components ('use client') within server component pages"
    - "Suspense boundary required for useSearchParams in Next.js 16"
    - "Signed JWT session injection for e2e proxy route testing without database"
key_files:
  created:
    - "src/components/auth/magic-link-form.tsx"
    - "src/components/auth/magic-link-verify.tsx"
    - "src/components/auth/logout-button.tsx"
    - "playwright.config.ts"
    - "tests/auth.spec.ts"
    - "tests/helpers/session.ts"
  modified:
    - "src/app/(public)/login/page.tsx"
    - "src/app/(public)/auth/verify/page.tsx"
    - "src/app/(authenticated)/layout.tsx"
    - "src/app/admin/layout.tsx"
decisions: []
metrics:
  duration: "~8 minutes"
  completed: "2026-02-20"
---

# Phase 1 Plan 5: Auth UI Components, Wiring, and End-to-End Verification Summary

Three client components (MagicLinkForm, MagicLinkVerify, LogoutButton) using React 19 useActionState and shadcn/ui, wired into login/verify pages and authenticated layouts, verified by 19 Playwright e2e tests covering public pages, proxy routing, and role-based isolation.

## What Was Done

### Task 1: Create auth client components (form, verify, logout)
- Created `src/components/auth/magic-link-form.tsx`: client component using React 19 `useActionState` to wire form submission to the `requestMagicLink` server action; renders shadcn Card with email input, submit button with loading state ("Sending..."), inline error display, and success state showing "Check your email" with 10-minute expiry notice
- Created `src/components/auth/magic-link-verify.tsx`: two-step token verification client component; reads token from URL search params via `useSearchParams`; renders four states (idle/loading/success/error) in shadcn Cards; critically does NOT auto-consume token on mount -- requires explicit button click (POST to `/api/auth/magic-link/verify`) to prevent email client prefetch bots from consuming tokens; on success, brief delay then `router.push` to role-based dashboard
- Created `src/components/auth/logout-button.tsx`: ghost-variant button that POSTs to `/api/auth/logout`, shows "Signing out..." loading state, then redirects to /login; graceful error handling redirects anyway since session may already be invalid
- **Commit:** `8002533`

### Task 2: Wire auth components into pages and layouts
- Updated `src/app/(public)/login/page.tsx`: replaced Plan 04 placeholder with MagicLinkForm import and render; kept server component (no 'use client') with metadata export
- Updated `src/app/(public)/auth/verify/page.tsx`: replaced placeholder with MagicLinkVerify wrapped in React Suspense boundary (required by Next.js 16 for useSearchParams); loading fallback with centered spinner text
- Updated `src/app/(authenticated)/layout.tsx`: imported LogoutButton, added to header alongside user email display
- Updated `src/app/admin/layout.tsx`: imported LogoutButton, added to admin header alongside user email display
- **Commit:** `14858b4`

### Task 3: End-to-end verification via Playwright
- Created `playwright.config.ts`: chromium project, single worker, dev server integration with `npm run dev`, baseURL localhost:3000
- Created `tests/helpers/session.ts`: utility to create signed JWT session cookies matching the app's `encrypt()` function using jose library; enables proxy route testing without a running database
- Created `tests/auth.spec.ts`: 19 e2e tests in 4 describe blocks:
  - **Public pages (7 tests):** root redirect to /login, login form rendering and input attributes, verify page without token (Invalid Link), verify page with token (Confirm Sign In button), invalid token error flow, Request New Link navigation
  - **Proxy unauthenticated protection (3 tests):** /candidate, /employer, /admin all redirect to /login
  - **Proxy authenticated on public routes (4 tests):** candidate/employer/admin on /login redirect to their dashboard, candidate on / redirects to /candidate
  - **Role-based route isolation (5 tests):** candidate cannot access /admin or /employer, employer cannot access /admin or /candidate, admin CAN access /admin
- All 19 tests passed
- **Commit:** `505ebdc`

## Verification Results

| Check | Result |
|-------|--------|
| 19/19 Playwright e2e tests pass | PASS |
| Login page renders MagicLinkForm (not placeholder) | PASS |
| Verify page renders MagicLinkVerify wrapped in Suspense | PASS |
| Verify page does NOT auto-consume token on mount | PASS |
| Verify page POSTs to /api/auth/magic-link/verify on button click | PASS |
| LogoutButton POSTs to /api/auth/logout | PASS |
| Authenticated layout shows user email and LogoutButton | PASS |
| Admin layout shows user email and LogoutButton | PASS |
| MagicLinkForm uses useActionState (NOT useFormState) | PASS |
| All components use shadcn/ui (Button, Input, Card, Label) | PASS |
| Root / redirects unauthenticated to /login | PASS |
| Proxy redirects authenticated users away from /login to role dashboard | PASS |
| Role-based isolation: candidate/employer cannot access /admin | PASS |
| Role-based isolation: candidate/employer cannot cross-access each other | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Phase 1 Completion

This is the final plan (5 of 5) in Phase 1: Foundation and Auth. The phase is now complete.

### What Phase 1 delivered:
1. **Plan 01-01:** Next.js 16 scaffold, Drizzle ORM, database schema (users, sessions, magic_link_tokens, rate_limit_attempts)
2. **Plan 01-02:** Auth library (encrypt/decrypt/session CRUD), DAL (getUser/verifySession), proxy.ts route protection
3. **Plan 01-03:** Server action (requestMagicLink), API routes (verify, logout), Resend email integration, rate limiting
4. **Plan 01-04:** Route groups ((public)/(authenticated)/admin), layouts with auth checks, placeholder pages
5. **Plan 01-05:** Auth UI components, page wiring, 19 e2e Playwright tests

### Complete auth flow:
Email input -> requestMagicLink server action -> Resend email -> magic link URL -> two-step verify page -> session cookie -> role-based redirect -> authenticated dashboard with logout

### Still required from user before moving to Phase 2:
- Neon PostgreSQL configured with DATABASE_URL
- Schema applied via `npx drizzle-kit push`
- SESSION_SECRET generated and set
- Resend API key and email configured
