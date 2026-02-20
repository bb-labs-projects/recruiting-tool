---
phase: 05-search-and-discovery
plan: 02
subsystem: employer-ui
tags: [filters, checkboxes, save-button, optimistic-ui, url-params, multi-select]
depends_on:
  requires: [05-01]
  provides: [filter-ui, save-unsave-action, saved-button-component, enhanced-browse-page]
  affects: [05-03, 05-04, 05-05]
tech-stack:
  added: [shadcn-checkbox]
  patterns: [optimistic-ui-useOptimistic, multi-value-url-params, debounced-input, server-action-toggle]
key-files:
  created:
    - src/actions/saved-profiles.ts
    - src/app/(authenticated)/employer/browse/saved-button.tsx
    - src/components/ui/checkbox.tsx
  modified:
    - src/app/(authenticated)/employer/browse/filters.tsx
    - src/app/(authenticated)/employer/browse/page.tsx
    - src/components/employer/profile-card.tsx
    - src/app/(authenticated)/employer/browse/[id]/page.tsx
decisions: []
metrics:
  duration: ~4 min
  completed: 2026-02-20
---

# Phase 5 Plan 2: Search/Filter UI and Save Functionality Summary

Multi-select filter panel with checkboxes, debounced location input, patent bar toggle, and save/unsave heart button with optimistic UI via useOptimistic.

## What Was Built

### Task 1: Server Action for Save/Unsave and SaveButton Client Component
- Created `toggleSaveProfile` server action in `src/actions/saved-profiles.ts` with auth check (user role must be 'employer'), insert-or-delete toggle on savedProfiles table, and revalidatePath for both `/employer/browse` and `/employer/saved`
- Created `SaveButton` client component in `saved-button.tsx` using `useOptimistic` for instant UI feedback and `useTransition` for pending state. Shows filled red heart when saved, outline heart when not. Disabled during pending state to prevent double-clicks. Includes aria-labels for accessibility.
- Installed shadcn `checkbox` component via `npx shadcn@latest add checkbox`

### Task 2: Enhanced Filter UI, Browse Page Wiring, and Profile Card/Detail Updates
- Rewrote `filters.tsx` from two single-select dropdowns to a comprehensive filter panel:
  - Specializations: multi-select checkbox group (6 options), URL param `spec` with repeated params pattern (`spec=A&spec=B`)
  - Technical Domains: multi-select checkbox group (8 options), URL param `tech` with same repeated params pattern
  - Experience Range: single-select dropdown (unchanged behavior, same options)
  - Patent Bar: toggle checkbox labeled "USPTO Patent Bar", URL param `patent_bar=true`
  - Location: debounced text input (300ms) for bar admission jurisdiction, URL param `location`
  - Clear All Filters button: removes all filter params except search query `q`, only visible when filters are active
- Updated browse page (`page.tsx`) to:
  - Read all new filter params (spec, tech, experience, patent_bar, location) and pass to `getAnonymizedProfiles`
  - Load saved profile IDs batch via `getSavedProfileIds` and pass `isSaved` to each ProfileCard
  - Preserve all active filters in pagination URL params
  - Improved empty state with contextual guidance (filter-aware message with clear-all link)
- Updated `ProfileCard` to accept `isSaved` prop and render `SaveButton` in the card header (top-right)
- Updated profile detail page to check `isProfileSaved` from DAL and render `SaveButton` next to the title heading

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

No new architectural decisions were needed. All implementation choices followed the plan specification directly.

## Commits

| Hash | Message |
|------|---------|
| 3765f0e | feat(05-02): server action for save/unsave and SaveButton client component |
| 26d169c | feat(05-02): enhanced filter UI, browse page wiring, and profile card/detail updates |

## Next Phase Readiness

- Filter UI is fully wired to the DAL layer from Plan 05-01
- SaveButton component is reusable -- can be imported into the saved profiles page (Plan 05-03)
- All filter state in URL params enables direct linking and browser back/forward navigation
- The `toggleSaveProfile` server action revalidates `/employer/saved` path, ready for the saved profiles page
