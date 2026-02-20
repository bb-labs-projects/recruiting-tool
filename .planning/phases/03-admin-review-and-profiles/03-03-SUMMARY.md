---
phase: 03-admin-review-and-profiles
plan: 03
subsystem: admin-ui
tags: [tanstack-table, data-table, server-component, drizzle-query, candidate-list]
depends_on:
  - "01-foundation-and-auth"
  - "02-cv-parsing-pipeline"
  - "03-01"
provides:
  - "Candidate list page at /admin/candidates with searchable, sortable, filterable data table"
  - "CandidateRow type for candidate table data shape"
  - "Reusable DataTable component with TanStack Table (search, filter, sort, pagination)"
  - "Column definitions with StatusBadge, ConfidenceBadge, and custom confidence sorting"
  - "Summary cards showing candidate counts by status"
affects:
  - "03-04: Detail page linked from candidate name column"
  - "03-05: End-to-end verification includes candidate list browsing"
tech_stack:
  added: []
  patterns:
    - "Server component data fetching with Drizzle relational queries and client component DataTable"
    - "TanStack Table with getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel"
    - "Custom sorting function for confidence-based attention column (low=0, medium=1, high=2)"
    - "Global filter function searching across multiple columns (name + email)"
key_files:
  created:
    - "src/app/admin/candidates/page.tsx"
    - "src/app/admin/candidates/columns.tsx"
    - "src/app/admin/candidates/data-table.tsx"
  modified: []
decisions: []
metrics:
  duration: "~4 minutes"
  completed: "2026-02-20"
---

# Phase 3 Plan 3: Candidate List Page with Data Table Summary

Searchable, sortable, filterable candidate list at /admin/candidates using TanStack Table with server-side Drizzle relational queries, confidence-based attention sorting (low-confidence first), status badges, and summary count cards.

## What Was Done

### Task 1: Create TanStack Table column definitions and DataTable client component
- Created `src/app/admin/candidates/columns.tsx`:
  - Defined `CandidateRow` type with id, name, email, status, specializations, lowestConfidence, createdAt
  - 5 column definitions: Name (linked to detail page, sortable), Status (StatusBadge), Attention (ConfidenceBadge with custom sort), Specializations (truncated at 3+N more, not sortable), Added (date, sortable)
  - Custom confidence sort: low=0, medium=1, high=2 so ascending sorts low-confidence first
  - Sortable headers use ghost Button with ArrowUpDown icon
- Created `src/app/admin/candidates/data-table.tsx`:
  - Generic DataTable client component wrapping TanStack Table
  - Default sorting: lowestConfidence ascending, then createdAt descending
  - Global search filters across name and email fields
  - Status filter dropdown (All / Pending Review / Active / Rejected) using shadcn Select
  - Pagination with Previous/Next buttons and "Page X of Y" indicator
  - Empty state: "No candidates found." centered message
- **Commit:** `eacaeb1`

### Task 2: Create candidates server page with data fetching
- Created `src/app/admin/candidates/page.tsx` as a server component:
  - Fetches all profiles via `db.query.profiles.findMany()` with nested relations (profileSpecializations, education, workHistory, barAdmissions, profileTechnicalDomains)
  - Transforms data: flattens specializations from junction table, computes lowest confidence across all field-level confidences
  - Confidence computation spans: nameConfidence, emailConfidence, phoneConfidence, education, workHistory, barAdmissions, profileSpecializations, profileTechnicalDomains
  - Summary cards row: Total, Pending Review (amber), Active (green), Rejected (red)
  - Renders DataTable with columns and transformed candidate rows
- **Commit:** `bcbf019`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` compiles without errors | PASS |
| /admin/candidates route exists (page.tsx) | PASS |
| DataTable has 5 columns: Name, Status, Attention, Specializations, Added | PASS |
| Name column links to /admin/candidates/[id] | PASS |
| Status column renders StatusBadge | PASS |
| Attention column renders ConfidenceBadge with custom sort | PASS |
| Search input filters by name/email | PASS |
| Status dropdown filters by status | PASS |
| Column headers sortable (Name, Attention, Added) | PASS |
| Pagination controls (Previous/Next) present | PASS |
| Page is server component (no 'use client') | PASS |
| Data fetched via db.query.profiles.findMany with relations | PASS |
| Lowest confidence computed across all fields | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 03-04:
- Candidate names link to `/admin/candidates/[id]` (detail page route)
- CandidateRow type exported for potential reuse
- Relational query pattern established for fetching full profile data with nested relations

### What's ready for Plan 03-05:
- Candidate list page functional for end-to-end admin workflow testing
- Summary cards provide quick status overview
- Search, filter, sort, and pagination all client-side for responsive UX
