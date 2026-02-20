---
phase: 03-admin-review-and-profiles
plan: 02
subsystem: server-actions
tags: [server-actions, zod, drizzle, profile-mutations, admin-auth]
depends_on:
  - "03-01"
provides:
  - "approveProfile server action (sets status to active, records reviewer)"
  - "rejectProfile server action (sets status to rejected with notes)"
  - "updateProfileField server action (updates name/email/phone, sets confidence to high)"
  - "updateEducation server action (updates education entry with profileId guard)"
  - "updateWorkHistory server action (updates work history entry with profileId guard)"
  - "updateBarAdmission server action (updates bar admission entry with profileId guard)"
affects:
  - "03-04: Review UI will call these server actions for all profile mutations"
  - "03-05: End-to-end verification will test these actions through the UI"
tech_stack:
  added: []
  patterns:
    - "Server actions with 'use server' directive for all profile mutations"
    - "requireAdmin() helper pattern for admin-only access enforcement"
    - "Computed property names for dynamic field + confidence updates"
    - "AND condition on child table updates (id + profileId) to prevent cross-profile edits"
    - "Zod .optional().or(z.literal('')) for optional form fields, empty string to null conversion"
key_files:
  created:
    - "src/actions/profiles.ts"
  modified: []
decisions: []
metrics:
  duration: "~2 minutes"
  completed: "2026-02-20"
---

# Phase 3 Plan 2: Profile Server Actions Summary

Six server actions for profile review and editing: approve/reject profiles, update top-level fields (name/email/phone) with dynamic confidence promotion, and update child table entries (education, work history, bar admissions) with cross-profile edit prevention via compound WHERE clauses.

## What Was Done

### Task 1: Create core profile actions (approve, reject, update field)
- Created `src/actions/profiles.ts` with `'use server'` directive
- Implemented `requireAdmin()` helper that calls `getUser()` from DAL and throws on non-admin
- `approveProfile`: validates profileId with Zod, sets status to 'active', records reviewedAt/reviewedBy, revalidates both list and detail paths
- `rejectProfile`: validates profileId and rejectionNotes (min 1 char), sets status to 'rejected' with notes, records reviewer
- `updateProfileField`: validates profileId, fieldName (enum: name/email/phone), value; uses computed property names to update both the field and its confidence column to 'high'
- All actions wrapped in try/catch with structured `{ success: true }` or `{ error: string }` returns
- **Commit:** `20ba31c`

### Task 2: Add child table update actions (education, work history, bar admissions)
- `updateEducation`: validates educationId, profileId, institution, degree, field (all required), year (optional); updates with `and(eq(id), eq(profileId))` for security; sets confidence to 'high'
- `updateWorkHistory`: validates workHistoryId, profileId, employer, title (required), startDate/endDate/description (optional); same security pattern
- `updateBarAdmission`: validates barAdmissionId, profileId, jurisdiction (required), year/status (optional); same security pattern
- All optional fields use `.optional().or(z.literal(''))` for Zod validation, with empty string to null conversion before database write
- All child table actions revalidate the profile detail path
- **Commit:** `ee320f6`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` passes with no errors | PASS |
| src/actions/profiles.ts exports all 6 functions | PASS |
| Every action has admin check (requireAdmin) | PASS |
| Every action has Zod validation (safeParse) | PASS |
| Every action calls revalidatePath | PASS |
| updateProfileField uses computed property names for dynamic field + confidence | PASS |
| Child table updates use AND condition (id + profileId) | PASS |
| Child table updates set confidence to 'high' | PASS |
| Optional fields convert empty strings to null | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 03-03 (Candidate List Page):
- Server actions available for any inline actions on the list page (e.g., quick approve/reject buttons)

### What's ready for Plan 03-04 (Profile Detail / Review UI):
- All 6 server actions ready to be called from the review UI forms
- approveProfile and rejectProfile for review workflow buttons/dialogs
- updateProfileField for inline editing of name, email, phone
- updateEducation, updateWorkHistory, updateBarAdmission for section editing forms
- All actions return `{ success: true }` or `{ error: string }` for UI feedback
