---
phase: 06-monetization
plan: 03
subsystem: admin-analytics
tags: [analytics, admin-dashboard, aggregate-queries, revenue-tracking, profile-views]
depends_on:
  requires: [06-01]
  provides: [admin-analytics-dal, analytics-page, live-admin-dashboard]
  affects: []
tech-stack:
  added: []
  patterns: [cached-aggregate-queries, batch-specialization-loading, summary-card-grid]
key-files:
  created:
    - src/lib/dal/admin-analytics.ts
    - src/app/admin/analytics/page.tsx
  modified:
    - src/app/admin/page.tsx
decisions: []
metrics:
  duration: ~3 min
  completed: 2026-02-20
status: complete
---

# Phase 6 Plan 3: Admin Analytics Dashboard and Live Dashboard Data Summary

Cached aggregate queries for revenue, unlocks, views, and conversion rate with analytics page and live admin dashboard counts.

## What Was Built

### Task 1: Admin Analytics DAL and Analytics Page
- Created `src/lib/dal/admin-analytics.ts` with three cached query functions:
  - `getAnalyticsSummary()` -- aggregates total revenue (sum of amountPaid), total unlocks (count), total profile views (count), active profiles (count where status='active'), approved employers (count where status='approved'), and conversion rate (unlocks/views with zero-division protection)
  - `getTopProfiles(limit)` -- most viewed active profiles via GROUP BY on profileViews, joined with profiles for status filter, batch-loads specializations via profileSpecializations junction table
  - `getRecentUnlocks(limit)` -- latest unlock transactions joined with users for employer email, batch-loads specializations for display
- All functions follow existing DAL pattern: `import 'server-only'`, `cache()` wrapper, db import from `@/lib/db`
- Created `src/app/admin/analytics/page.tsx`:
  - Server component with admin auth gate (getUser, role !== 'admin' -> redirect)
  - Summary cards grid (4 cards): Total Revenue ($formatted), Total Unlocks, Profile Views, Conversion Rate (%)
  - Two-column layout below: Most Viewed Profiles table (specialization badges, view count, link to admin candidate detail) and Recent Unlocks table (employer email, specialization badges, amount, date)
  - Empty states for both tables when no data exists
  - Uses shadcn/ui Card, Table, Badge components and lucide-react icons

### Task 2: Update Admin Dashboard with Live Data
- Admin dashboard (`src/app/admin/page.tsx`) was already updated with live database counts during 06-02 plan execution (commit 37c6e80)
- Verified the existing implementation satisfies all requirements: active candidates count, approved employers count, total revenue formatted as dollars, Quick Links card with navigation to analytics/candidates/employers
- No additional changes needed -- all placeholder "--" values were already replaced

## Deviations from Plan

### Task 2 Already Completed

**Found during:** Task 2 execution
**Issue:** The admin dashboard live data update (Task 2) was already completed as part of Plan 06-02 (commit 37c6e80). The admin/page.tsx already contained live database queries, proper formatting, and quick links including /admin/analytics.
**Resolution:** Verified the existing implementation meets all Task 2 requirements. No additional commit needed for Task 2.

## Decisions Made

None -- plan executed without requiring architectural decisions.

## Commits

| Hash | Message |
|------|---------|
| c350ede | feat(06-03): add admin analytics DAL and analytics page |

## Next Phase Readiness

- Admin analytics is complete -- revenue, unlock count, view count, conversion rate all visible
- Analytics page shows most viewed profiles and recent unlock transactions
- Admin dashboard shows live data (already completed in 06-02)
- No new environment variables or database schema changes required
- Phase 6 (Monetization) is now fully complete
