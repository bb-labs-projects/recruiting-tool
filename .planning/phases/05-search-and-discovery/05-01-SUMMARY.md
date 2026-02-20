---
phase: 05-search-and-discovery
plan: 01
subsystem: data-layer
tags: [drizzle, postgresql, pg_trgm, search, filtering, saved-profiles]
depends_on:
  requires: [04-01, 04-04]
  provides: [dynamic-filtering-dal, saved-profiles-schema, trigram-indexes]
  affects: [05-02, 05-03, 05-04]
tech-stack:
  added: []
  patterns: [two-query-strategy, exists-subquery-filtering, escapeIlike, post-query-experience-filter]
key-files:
  created:
    - drizzle/0001_enable_pg_trgm.sql
    - src/lib/dal/employer-saved.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/relations.ts
    - src/lib/dal/employer-profiles.ts
    - src/app/(authenticated)/employer/browse/page.tsx
    - src/app/(authenticated)/employer/browse/filters.tsx
decisions:
  - id: 05-01-D1
    description: "Two-query strategy: filter with select builder (EXISTS subqueries), then load data with relational API (column inclusion mode)"
  - id: 05-01-D2
    description: "Post-query experience range filtering in JS rather than SQL, since experience is computed from work_history dates and scale is <1000 profiles"
  - id: 05-01-D3
    description: "URL param renamed from 'specialization' (singular) to 'spec' (short, supports multi-value via repeated params)"
metrics:
  duration: ~4 min
  completed: 2026-02-20
---

# Phase 5 Plan 1: Search and Filter Data Layer Summary

Dynamic multi-filter DAL with EXISTS subqueries on junction tables, pg_trgm GIN indexes for ILIKE acceleration, and saved profiles schema/DAL.

## What Was Built

### Task 1: Schema Extension and pg_trgm Migration
- Added `savedProfiles` junction table to `schema.ts` with composite primary key on (employerUserId, profileId), FK references to users and profiles with cascade delete, and two indexes
- Added `savedProfilesRelations` to `relations.ts` with bidirectional relations (user -> saves, profile -> saves)
- Updated `usersRelations` and `profilesRelations` to include `many(savedProfiles)`
- Created `drizzle/0001_enable_pg_trgm.sql` custom migration enabling pg_trgm extension and 5 GIN indexes on non-PII text columns (specializations.name, technical_domains.name, bar_admissions.jurisdiction, education.institution, education.field)

### Task 2: Employer DAL Rewrite and Saved Profiles DAL
- Rewrote `getAnonymizedProfiles` using two-query strategy:
  - Step 1: Filter query with `db.select({ id }).from(profiles).where(and(...conditions))` using EXISTS subqueries for specialization, technical domain, patent bar, and location filters, plus raw SQL EXISTS for free-text search across non-PII fields
  - Step 1b: Post-query experience range filter (computes bucketExperienceYears from work history, filters in JS)
  - Step 1c: JS-level pagination on filtered ID list
  - Step 2: Relational query with `inArray(profiles.id, paginatedIds)` using column inclusion mode for anonymization
  - Step 3: DTO transform with order preservation from filter query
- Added `escapeIlike` helper to prevent ILIKE injection (escapes %, _, \)
- Added `SearchFilters` type with all filter dimensions
- Created `employer-saved.ts` with three cached DAL functions: `getSavedProfileIds` (batch lookup for browse page), `getSavedProfiles` (full list for saved page), `isProfileSaved` (single check for detail page)
- Kept `getAnonymizedProfileById` unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated browse page for new SearchFilters API**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Browse page called `getAnonymizedProfiles` with old `specialization` (singular string) property, which doesn't exist on new `SearchFilters` type
- **Fix:** Updated page.tsx to use `spec` URL param with array normalization, updated filters.tsx to use `spec` param key
- **Files modified:** `src/app/(authenticated)/employer/browse/page.tsx`, `src/app/(authenticated)/employer/browse/filters.tsx`
- **Commit:** 61972ce (included in Task 2 commit)

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 05-01-D1 | Two-query strategy: select builder for filtering, relational API for data loading | Select builder enables EXISTS subqueries for junction table filtering; relational API maintains clean column inclusion mode for anonymization |
| 05-01-D2 | Post-query experience range filtering in JS | Experience is computed from work_history dates (not a stored column). At <1000 profiles, loading work history for matched IDs and filtering in JS is fast enough. Avoids complex SQL CTEs. |
| 05-01-D3 | URL param renamed from `specialization` to `spec` | Shorter, supports multi-value via repeated params (`spec=A&spec=B`), aligns with future multi-select UI |

## Commits

| Hash | Message |
|------|---------|
| b0d15f9 | feat(05-01): schema extension and pg_trgm migration |
| 61972ce | feat(05-01): rewrite employer DAL with dynamic filtering and add saved profiles DAL |

## Next Phase Readiness

- Schema: `savedProfiles` table defined but not yet pushed to DB. User must run `npx drizzle-kit push` to apply.
- Migration: `drizzle/0001_enable_pg_trgm.sql` must be run manually against the database for GIN indexes.
- DAL is ready for frontend integration (Plan 05-02 filter UI, Plan 05-03 saved profiles UI).
- The `SearchFilters` type supports all filter dimensions that the frontend will need.
