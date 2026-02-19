---
phase: 01-foundation-and-auth
plan: 04
subsystem: routing
tags: [routing, route-groups, layouts, next-js, app-router, auth-check, dal, shadcn-ui, dashboard]
depends_on:
  - "01-02: DAL (getUser, verifySession), session decrypt, auth constants"
provides:
  - "Complete route group structure: (public), (authenticated), admin"
  - "Public layout with centered container for login/verify pages"
  - "Authenticated layout with DAL session verification and app shell header"
  - "Admin layout with sidebar navigation and admin role enforcement"
  - "Root page redirect router (session-aware, redirects to role dashboard or /login)"
  - "Placeholder login and verify pages with shadcn Card components"
  - "Candidate, employer, and admin dashboard skeletons with placeholder cards"
affects:
  - "01-05: Auth UI components render within the public layout (login/verify pages)"
  - "All future pages will be created within these route groups"
  - "Dashboard pages will be replaced with real data in later phases"
tech_stack:
  added: []
  patterns:
    - "Route groups with () for URL-independent layout grouping"
    - "DAL-based auth verification in layouts (getUser redirect pattern)"
    - "Defense-in-depth: admin role checked in both layout and page"
    - "Server component pages call DAL directly (no API layer needed)"
    - "Root page as pure redirect router (no UI rendered)"
key_files:
  created:
    - "src/app/(public)/layout.tsx"
    - "src/app/(public)/login/page.tsx"
    - "src/app/(public)/auth/verify/page.tsx"
    - "src/app/(authenticated)/layout.tsx"
    - "src/app/(authenticated)/candidate/layout.tsx"
    - "src/app/(authenticated)/candidate/page.tsx"
    - "src/app/(authenticated)/employer/layout.tsx"
    - "src/app/(authenticated)/employer/page.tsx"
    - "src/app/admin/layout.tsx"
    - "src/app/admin/page.tsx"
  modified:
    - "src/app/layout.tsx"
    - "src/app/page.tsx"
decisions: []
metrics:
  duration: "~4 minutes"
  completed: "2026-02-19"
---

# Phase 1 Plan 4: Route Groups, Layouts, and Placeholder Pages Summary

Complete Next.js App Router route structure with three layout zones: centered public layout for login/verify, authenticated layout with DAL session verification and app shell header, and admin layout with sidebar navigation and admin role enforcement. Root page acts as session-aware redirect router.

## What Was Done

### Task 1: Create route groups, layouts, and root page
- Updated `src/app/layout.tsx`: changed metadata title to "IP Lawyer Recruiting" and description to "Connect IP lawyers with opportunities"; kept existing Geist font setup and globals.css import
- Replaced `src/app/page.tsx`: now a pure redirect router that reads session cookie via decrypt, redirects to role-based dashboard (admin/employer/candidate) if authenticated, or /login if not; never renders UI
- Created `src/app/(public)/layout.tsx`: centered layout with min-h-screen, flex centering, max-w-md container, and "IP Lawyer Recruiting" heading; no auth checks
- Created `src/app/(authenticated)/layout.tsx`: async server component that calls getUser() from DAL, redirects to /login if null; renders app shell with header (app name + user email) and main content area
- Created `src/app/admin/layout.tsx`: async server component that calls getUser() from DAL, redirects to /login if user is null or role is not admin; renders sidebar (w-64, dark bg) with navigation links (Dashboard, Candidates, Employers, Analytics) and main content area with header
- **Commit:** `b65fd92`

### Task 2: Create public placeholder pages (login, verify)
- Created `src/app/(public)/login/page.tsx`: shadcn Card with "Sign In" title and description; placeholder for magic link form; exports metadata with title "Sign In"
- Created `src/app/(public)/auth/verify/page.tsx`: shadcn Card with "Verify Your Login" title; placeholder for token confirmation; exports metadata with title "Verify Login"
- Both pages render within the centered public layout
- **Commit:** `dbaf477`

### Task 3: Create authenticated area pages (candidate, employer, admin)
- Created `src/app/(authenticated)/candidate/layout.tsx`: pass-through wrapper with padding
- Created `src/app/(authenticated)/candidate/page.tsx`: async server component calling getUser(), renders "Candidate Dashboard" with welcome message and three shadcn Cards (My Profile, Job Matches, Settings)
- Created `src/app/(authenticated)/employer/layout.tsx`: pass-through wrapper with padding
- Created `src/app/(authenticated)/employer/page.tsx`: async server component calling getUser(), renders "Employer Dashboard" with welcome message and three shadcn Cards (Browse Candidates, Saved Profiles, My Jobs)
- Created `src/app/admin/page.tsx`: async server component with defense-in-depth role check (redirects if not admin even though layout also checks); renders "Admin Dashboard" with three stat cards (Candidates, Employers, Revenue) showing placeholder values
- **Commit:** `16b8067`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` zero type errors | PASS |
| Route structure: (public)/login/page.tsx exists | PASS |
| Route structure: (public)/auth/verify/page.tsx exists | PASS |
| Route structure: (authenticated)/candidate/page.tsx exists | PASS |
| Route structure: (authenticated)/employer/page.tsx exists | PASS |
| Route structure: admin/page.tsx exists | PASS |
| Authenticated layout calls getUser() from DAL | PASS |
| Admin layout checks role === 'admin' | PASS |
| Admin page has redundant role check (defense-in-depth) | PASS |
| Root page.tsx redirects to /login or role-based dashboard | PASS |
| All dashboard pages use shadcn Card components | PASS |
| Login and verify pages use shadcn Card components | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 01-05 (Auth UI):
- Login page placeholder at (public)/login/page.tsx ready to be replaced with MagicLinkForm
- Verify page placeholder at (public)/auth/verify/page.tsx ready to be replaced with token verification UI
- Logout button area placeholder in authenticated layout header
- Public layout provides centered container for auth forms
- All route groups and layouts in place for rendering auth components

### Still required from user:
- Neon PostgreSQL configured with DATABASE_URL
- Schema applied via `npx drizzle-kit push`
- SESSION_SECRET generated and set
- Resend API key and email configured
