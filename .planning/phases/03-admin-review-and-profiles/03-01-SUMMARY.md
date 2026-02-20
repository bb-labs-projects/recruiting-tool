---
phase: 03-admin-review-and-profiles
plan: 01
subsystem: data-model
tags: [drizzle, relations, shadcn-ui, tanstack-table, schema, badge-components]
depends_on:
  - "01-foundation-and-auth"
  - "02-cv-parsing-pipeline"
provides:
  - "profileStatusEnum (pending_review, active, rejected) for review workflow"
  - "Extended profiles table with status, rejectionNotes, reviewedAt, reviewedBy columns"
  - "Drizzle v1 relations for all profile-related tables (7 relation objects)"
  - "db instance configured with both schema and relations for db.query API"
  - "8 shadcn/ui components (table, badge, tabs, dialog, select, textarea, separator, resizable)"
  - "@tanstack/react-table for data table functionality"
  - "ConfidenceBadge component (high/medium/low with green/amber/red)"
  - "StatusBadge component (pending_review/active/rejected with human-readable labels)"
affects:
  - "03-02: Server actions depend on profileStatusEnum and review columns"
  - "03-03: Candidate list page depends on TanStack Table, StatusBadge, ConfidenceBadge, and db.query with relations"
  - "03-04: Profile detail page depends on Drizzle relational queries, Resizable, Tabs, Dialog, and badge components"
  - "03-05: End-to-end verification depends on all of the above"
tech_stack:
  added:
    - "@tanstack/react-table@^8.21.3"
    - "react-resizable-panels (via shadcn/ui resizable)"
  patterns:
    - "Drizzle v1 relations with db.query for eager-loading nested profile data"
    - "Schema + relations spread into drizzle() config: { ...schema, ...relations }"
    - "Presentational badge components with color maps (no 'use client' needed)"
key_files:
  created:
    - "src/lib/db/relations.ts"
    - "src/components/admin/confidence-badge.tsx"
    - "src/components/admin/status-badge.tsx"
    - "src/components/ui/table.tsx"
    - "src/components/ui/badge.tsx"
    - "src/components/ui/tabs.tsx"
    - "src/components/ui/dialog.tsx"
    - "src/components/ui/select.tsx"
    - "src/components/ui/textarea.tsx"
    - "src/components/ui/separator.tsx"
    - "src/components/ui/resizable.tsx"
  modified:
    - "src/lib/db/schema.ts"
    - "src/lib/db/index.ts"
    - "package.json"
    - "package-lock.json"
decisions: []
metrics:
  duration: "~3 minutes"
  completed: "2026-02-20"
---

# Phase 3 Plan 1: Schema Extension, Drizzle Relations, Packages, and Badge Components Summary

Extended profiles table with profileStatusEnum (pending_review/active/rejected) and review tracking columns, defined Drizzle v1 relations for all 7 profile-related table relationships, installed 8 shadcn/ui components and TanStack Table, and created reusable ConfidenceBadge and StatusBadge components.

## What Was Done

### Task 1: Extend schema, define relations, update db instance, install packages
- Installed 8 shadcn/ui components: table, badge, tabs, dialog, select, textarea, separator, resizable
- Installed `@tanstack/react-table@^8.21.3` for headless data table functionality
- Added `profileStatusEnum` pgEnum with values: pending_review, active, rejected
- Extended profiles table with 4 new columns: status (default pending_review), rejectionNotes (nullable text), reviewedAt (nullable timestamp), reviewedBy (nullable UUID FK to users)
- Added index on profiles.status column for efficient filtering
- Created `src/lib/db/relations.ts` with 7 Drizzle v1 relation definitions:
  - profilesRelations: many(education, workHistory, barAdmissions, profileSpecializations, profileTechnicalDomains, cvUploads)
  - educationRelations: one(profiles)
  - workHistoryRelations: one(profiles)
  - barAdmissionsRelations: one(profiles)
  - profileSpecializationsRelations: one(profiles) + one(specializations)
  - profileTechnicalDomainsRelations: one(profiles) + one(technicalDomains)
  - cvUploadsRelations: one(profiles)
- Updated `src/lib/db/index.ts` to spread both schema and relations into drizzle config
- **Commit:** `9ccd7fe`

### Task 2: Create shared badge components (ConfidenceBadge, StatusBadge)
- Created `src/components/admin/confidence-badge.tsx`:
  - ConfidenceBadge accepts `level: 'high' | 'medium' | 'low'`
  - Renders green (high), amber (medium), red (low) badges with dark mode support
  - Uses shadcn/ui Badge with variant="outline" and color class overrides
- Created `src/components/admin/status-badge.tsx`:
  - StatusBadge accepts `status: 'pending_review' | 'active' | 'rejected'`
  - Renders amber (pending), green (active), red (rejected) badges with human-readable labels
  - Same pattern as ConfidenceBadge
- Both components are pure presentational (no 'use client' directive needed)
- **Commit:** `6f7f4aa`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` compiles without errors | PASS |
| 8 shadcn/ui components exist in src/components/ui/ | PASS |
| @tanstack/react-table in package.json dependencies | PASS |
| profileStatusEnum in schema with 3 values | PASS |
| profiles table has status, rejectionNotes, reviewedAt, reviewedBy | PASS |
| relations.ts exports 7 relation objects | PASS |
| db/index.ts imports and spreads relations | PASS |
| ConfidenceBadge exports from confidence-badge.tsx | PASS |
| StatusBadge exports from status-badge.tsx | PASS |
| Both badge components import from @/components/ui/badge | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 03-02:
- profileStatusEnum and review columns available for approve/reject server actions
- Drizzle relational queries enabled for fetching nested profile data
- Badge components ready for use in server action response UIs

### What's ready for Plan 03-03:
- TanStack Table installed for candidate list data table
- StatusBadge and ConfidenceBadge ready for column renderers
- db.query.profiles with relations ready for list page data fetching

### What's ready for Plan 03-04:
- Resizable component ready for side-by-side PDF/data layout
- Tabs, Dialog, Select, Textarea ready for profile detail UI
- Separator ready for section dividers
- Relational queries ready for loading full profile with nested data

### Note for deployment:
- User must run `npx drizzle-kit push` to apply new profileStatusEnum and profiles table columns to database
